import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { EncryptionService } from '../common/encryption.service';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { User, ShopifyStore } from '@prisma/client';

export interface BotSettings {
    name: string;
    personality: string;
    responseSpeed: string;
    theme: string;
    language: string;
    notifications: boolean;
    voiceEnabled: boolean;
    dataAccess: string;
    autoRespond: boolean;
}

@Injectable()
export class UsersService implements OnModuleInit {
    constructor(
        private readonly encryptionService: EncryptionService,
        private prisma: PrismaService
    ) { }

    async onModuleInit() {
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
            include: { shopifyStores: true }
        });
    }

    async createOrFind(profile: any): Promise<User> {
        const email = profile.emails[0].value;
        let user = await this.findByEmail(email);

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: profile.displayName,
                    picture: profile.photos?.[0]?.value,
                    createdAt: new Date().toISOString(),
                    ipAddress: profile.ipAddress,
                    lastTokenReset: Date.now()
                },
                include: { shopifyStores: true }
            });

            if (profile.ipAddress) {
                await this.fetchAndSetLocation(user.id, profile.ipAddress);
            }
        }
        return user;
    }

    async createUser(email: string, name: string, passwordHash: string): Promise<User> {
        const existing = await this.findByEmail(email);
        if (existing) throw new Error('User already exists');

        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                password: passwordHash,
                createdAt: new Date().toISOString(),
                lastTokenReset: Date.now()
            },
            include: { shopifyStores: true }
        });
        return user;
    }

    async fetchAndSetLocation(userId: string, ip: string): Promise<User | null> {
        let location = null;
        let currency = null;

        try {
            const response = await axios.get(`https://ipapi.co/${ip}/json/`);
            if (response.data && !response.data.error) {
                location = response.data.country_name || response.data.city;
                currency = response.data.currency;
            }
        } catch (error) {
            console.error(`[UsersService] Failed to fetch IP location for ${ip}:`, error.message);
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ipAddress: ip,
                ...(location && { location }),
                ...(currency && { currency })
            },
            include: { shopifyStores: true }
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
            include: { shopifyStores: true }
        });
    }

    async updateShopifyCredentials(userId: string, shop: string, token: string): Promise<User> {
        return this.addShopifyStore(userId, shop, token);
    }

    async addShopifyStore(userId: string, shop: string, token: string, name?: string): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
        if (!user) throw new Error('User not found');

        const existingStore = user.shopifyStores.find(s => s.shop === shop);
        const encryptedToken = this.encryptionService.encrypt(token);

        let updatedUser;

        if (existingStore) {
            await this.prisma.shopifyStore.update({
                where: { id: existingStore.id },
                data: { token: encryptedToken }
            });
            updatedUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
        } else {
            if (user.shopifyStores.length >= user.storeLimit) {
                throw new Error('Store limit reached. Please upgrade to add more stores.');
            }

            const store = await this.prisma.shopifyStore.create({
                data: {
                    shop,
                    token: encryptedToken,
                    name: name || shop.replace('.myshopify.com', ''),
                    addedAt: new Date().toISOString(),
                    userId: user.id
                }
            });

            updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    activeShopId: user.activeShopId || store.id,
                    shopifyShop: shop,
                    shopifyToken: encryptedToken
                },
                include: { shopifyStores: true }
            });
        }

        return this.recalculateTokens(updatedUser!);
    }

    async removeShopifyStore(userId: string, storeId: string): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
        if (!user) throw new Error('User not found');

        await this.prisma.shopifyStore.delete({ where: { id: storeId } });

        let userToRet: User | null = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
        if (!userToRet) throw new Error('User not found');

        if (userToRet.activeShopId === storeId) {
            const firstStore = (userToRet as any).shopifyStores?.[0];
            userToRet = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    activeShopId: firstStore?.id || null,
                    shopifyShop: firstStore?.shop || null,
                    shopifyToken: firstStore?.token || null
                },
                include: { shopifyStores: true }
            });
        }

        return this.recalculateTokens(userToRet);
    }

    async removeShopifyCredentials(userId: string): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            if (user.activeShopId) {
                return this.removeShopifyStore(userId, user.activeShopId);
            }
            const userToRet = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    shopifyShop: null,
                    shopifyToken: null,
                    activeShopId: null
                },
                include: { shopifyStores: true }
            });
            
            await this.prisma.shopifyStore.deleteMany({ where: { userId } });
            const finalUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
            return this.recalculateTokens(finalUser!);
        }
        throw new Error('User not found');
    }

    async setActiveShop(userId: string, storeId: string): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
        if (!user) throw new Error('User not found');

        const store = user.shopifyStores.find(s => s.id === storeId);
        if (!store) throw new Error('Store not found');

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                activeShopId: storeId,
                shopifyShop: store.shop,
                shopifyToken: store.token
            },
            include: { shopifyStores: true }
        });
    }

    async getActiveShop(userId: string): Promise<ShopifyStore | null> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { shopifyStores: true } });
        if (!user) return null;
        return this.getActiveStoreSync(user) || null;
    }

    private getActiveStoreSync(user: User & { shopifyStores?: ShopifyStore[] }): ShopifyStore | undefined {
        if (!user.shopifyStores || user.shopifyStores.length === 0) return undefined;
        if (user.activeShopId) {
            return user.shopifyStores.find(s => s.id === user.activeShopId);
        }
        return user.shopifyStores[0];
    }

    private async recalculateTokens(user: User & { shopifyStores?: ShopifyStore[] }): Promise<User> {
        const shopCount = user.shopifyStores?.length || 0;
        let aiTokens = 500;
        let reportTokens = 250;
        if (shopCount >= 2) {
            aiTokens = 1000;
            reportTokens = 500;
        }

        return this.prisma.user.update({
            where: { id: user.id },
            data: { aiTokens, reportTokens },
            include: { shopifyStores: true }
        });
    }

    async getDecryptedShopifyToken(userId: string): Promise<string | null> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user && user.shopifyToken) {
            return this.encryptionService.decrypt(user.shopifyToken);
        }
        return null;
    }

    async updateProfile(userId: string, data: Partial<User>): Promise<User> {
        const payload: any = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.email !== undefined) payload.email = data.email;
        if (data.password !== undefined) payload.password = data.password;
        if (data.isOnboardingComplete !== undefined) payload.isOnboardingComplete = data.isOnboardingComplete;
        if (data.refreshToken !== undefined) payload.refreshToken = data.refreshToken;
        if (data.aiTokens !== undefined) payload.aiTokens = data.aiTokens;
        if (data.reportTokens !== undefined) payload.reportTokens = data.reportTokens;
        if (data.botSettings !== undefined) payload.botSettings = data.botSettings as any;
        if (data.language !== undefined) payload.language = data.language;
        if (data.currency !== undefined) payload.currency = data.currency;
        if (data.location !== undefined) payload.location = data.location;
        if (data.signInCount !== undefined) payload.signInCount = data.signInCount;
        if (data.lastLoginDate !== undefined) payload.lastLoginDate = data.lastLoginDate;
        if (data.loginDates !== undefined) payload.loginDates = data.loginDates;

        return this.prisma.user.update({
            where: { id: userId },
            data: payload,
            include: { shopifyStores: true }
        });
    }

    async setRefreshToken(userId: string, refreshToken: string) {
        return this.updateProfile(userId, { refreshToken });
    }

    async completeOnboarding(userId: string) {
        return this.updateProfile(userId, { isOnboardingComplete: true });
    }

    async getAllUsers() {
        return this.prisma.user.findMany({ include: { shopifyStores: true } });
    }

    findAll() {
        return {
            users: [
                { id: 1, name: 'Alex Johnson', email: 'alex@example.com', status: 'active', plan: 'Premium', lastActive: '2 hours ago', location: 'New York', signupDate: '2024-01-15', avatar: 'AJ' },
            ],
            stats: {
                total: 15284,
                active: 8920,
                new: 1420,
                inactive: 5944,
                growth: 12.4
            }
        };
    }

    async checkAndReplenishTokens() {
        const users = await this.prisma.user.findMany({ include: { shopifyStores: true } });
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let updatedCount = 0;

        for (const user of users) {
            const lastReset = user.lastTokenReset || 0;
            if (now - lastReset >= THIRTY_DAYS_MS) {
                const shopCount = user.shopifyStores?.length || 0;
                const aiTokens = shopCount >= 2 ? 1000 : 500;
                const reportTokens = shopCount >= 2 ? 500 : 250;

                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { aiTokens, reportTokens, lastTokenReset: now }
                });
                updatedCount++;
            }
        }
        if (updatedCount > 0) {
            console.log(`[Tokens] Replenished tokens for ${updatedCount} users.`);
        }
    }

    async topUpTokens(userId: string, amount: number) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { aiTokens: { increment: amount } }
        });
        return { success: true, newBalance: user.aiTokens };
    }

    async updateShopSettings(userId: string, storeId: string, settings: Partial<BotSettings>): Promise<ShopifyStore> {
        const store = await this.prisma.shopifyStore.findUnique({ where: { id: storeId } });
        if (!store || store.userId !== userId) throw new Error('Store not found');

        const currentSettings = (store.botSettings as any) || {
            name: 'Analytics Assistant',
            personality: 'Professional',
            responseSpeed: 'Medium',
            theme: 'Blue',
            language: 'English',
            notifications: true,
            voiceEnabled: false,
            dataAccess: 'Limited',
            autoRespond: true
        };

        const newSettings = { ...currentSettings, ...settings };

        return this.prisma.shopifyStore.update({
            where: { id: storeId },
            data: { botSettings: newSettings }
        });
    }

    async setStoreTarget(userId: string, storeId: string, type: 'weekly' | 'monthly', value: number): Promise<ShopifyStore> {
        return this.prisma.shopifyStore.update({
            where: { id: storeId, userId },
            data: { targetType: type, targetValue: value }
        });
    }

    async getAiTokens(userId: string): Promise<number> {
        const user = await this.findById(userId);
        return user?.aiTokens || 0;
    }

    async increaseStoreLimit(userId: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { storeLimit: { increment: 1 } },
            include: { shopifyStores: true }
        });
    }

    async extendRetention(userId: string, months: number): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { retentionMonths: { increment: months } },
            include: { shopifyStores: true }
        });
    }

    async setFreeReports(userId: string, enable: boolean): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { hasFreeReports: enable },
            include: { shopifyStores: true }
        });
    }

    async setAllFreeReports(enable: boolean): Promise<number> {
        const res = await this.prisma.user.updateMany({
            data: { hasFreeReports: enable }
        });
        return res.count;
    }

    async deductReportToken(userId: string, amount: number = 1): Promise<User> {
        const user = await this.findById(userId);
        if (!user) throw new Error('User not found');
        if (user.hasFreeReports) return user;
        if (user.reportTokens < amount) throw new Error('Insufficient report tokens');

        return this.prisma.user.update({
            where: { id: userId },
            data: { reportTokens: { decrement: amount } },
            include: { shopifyStores: true }
        });
    }
}
