import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { EncryptionService } from '../common/encryption.service';
import { PlanService } from '../common/plan.service';
import axios from 'axios';
import { JsonDatabaseService } from '../database/json-database.service';
import { User, ShopifyStore } from '../database/interfaces';

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
        private readonly planService: PlanService,
        private db: JsonDatabaseService
    ) { }

    async onModuleInit() {
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.db.findUserByEmail(email);
    }

    async createOrFind(profile: any): Promise<User> {
        const email = profile.emails[0].value;
        let user = await this.findByEmail(email);

        if (!user) {
            user = this.db.createUser({
                email,
                name: profile.displayName,
                picture: profile.photos?.[0]?.value,
                createdAt: new Date().toISOString(),
                ipAddress: profile.ipAddress,
                lastTokenReset: Date.now()
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

        const user = this.db.createUser({
            email,
            name,
            password: passwordHash,
            createdAt: new Date().toISOString(),
            lastTokenReset: Date.now()
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

        return this.db.updateUser(userId, {
            ipAddress: ip,
            ...(location && { location }),
            ...(currency && { currency })
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.db.findUserById(id);
    }

    async updateShopifyCredentials(userId: string, shop: string, token: string): Promise<User> {
        return this.addShopifyStore(userId, shop, token);
    }

    async addShopifyStore(userId: string, shop: string, token: string, name?: string): Promise<User> {
        const user = this.db.findUserById(userId);
        if (!user) throw new Error('User not found');

        const existingStore = user.shopifyStores.find(s => s.shop === shop);
        const encryptedToken = this.encryptionService.encrypt(token);

        if (existingStore) {
            this.db.updateStore(existingStore.id, { token: encryptedToken });
        } else {
            // Plan-based store limit check
            const check = this.planService.canAddStore(user);
            if (!check.allowed) {
                throw new Error(check.reason || 'Store limit reached. Please upgrade to add more stores.');
            }

            const store = this.db.createStore(userId, {
                shop,
                token: encryptedToken,
                name: name || shop.replace('.myshopify.com', ''),
                addedAt: new Date().toISOString(),
            });

            this.db.updateUser(userId, {
                activeShopId: user.activeShopId || store.id,
                shopifyShop: shop,
                shopifyToken: encryptedToken
            });
        }

        const updatedUser = this.db.findUserById(userId)!;
        return this.recalculateTokens(updatedUser);
    }

    async removeShopifyStore(userId: string, storeId: string): Promise<User> {
        const user = this.db.findUserById(userId);
        if (!user) throw new Error('User not found');

        this.db.deleteStore(storeId);

        let userToRet = this.db.findUserById(userId);
        if (!userToRet) throw new Error('User not found');

        if (userToRet.activeShopId === storeId) {
            const firstStore = userToRet.shopifyStores?.[0];
            userToRet = this.db.updateUser(userId, {
                activeShopId: firstStore?.id || null,
                shopifyShop: firstStore?.shop || null,
                shopifyToken: firstStore?.token || null
            });
        }

        return this.recalculateTokens(userToRet);
    }

    async removeShopifyCredentials(userId: string): Promise<User> {
        const user = this.db.findUserById(userId);
        if (user) {
            if (user.activeShopId) {
                return this.removeShopifyStore(userId, user.activeShopId);
            }
            this.db.updateUser(userId, {
                shopifyShop: null,
                shopifyToken: null,
                activeShopId: null
            });

            this.db.deleteStoresByUserId(userId);
            const finalUser = this.db.findUserById(userId)!;
            return this.recalculateTokens(finalUser);
        }
        throw new Error('User not found');
    }

    async setActiveShop(userId: string, storeId: string): Promise<User> {
        const user = this.db.findUserById(userId);
        if (!user) throw new Error('User not found');

        const shopifyStore = user.shopifyStores.find(s => s.id === storeId);
        const socialStore = user.socialStores.find(s => s.id === storeId);

        if (shopifyStore) {
            return this.db.updateUser(userId, {
                activeShopId: storeId,
                shopifyShop: shopifyStore.shop,
                shopifyToken: shopifyStore.token
            });
        } else if (socialStore) {
            // Keep the previous Shopify credentials if selecting Social, 
            // or use first available if none. This allows products to still load.
            const primaryShop = user.shopifyStores[0];
            return this.db.updateUser(userId, {
                activeShopId: storeId,
                shopifyShop: user.shopifyShop || primaryShop?.shop || null,
                shopifyToken: user.shopifyToken || primaryShop?.token || null
            });
        } else {
            return this.db.updateUser(userId, {
                activeShopId: storeId,
                shopifyShop: null,
                shopifyToken: null
            });
        }
    }

    async getActiveShop(userId: string): Promise<ShopifyStore | null> {
        const user = this.db.findUserById(userId);
        if (!user) return null;
        return this.getActiveStoreSync(user) || null;
    }

    private getActiveStoreSync(user: User): ShopifyStore | undefined {
        if (!user.shopifyStores || user.shopifyStores.length === 0) return undefined;
        if (user.activeShopId) {
            return user.shopifyStores.find(s => s.id === user.activeShopId);
        }
        return user.shopifyStores[0];
    }

    private recalculateTokens(user: User): User {
        const shopCount = user.shopifyStores?.length || 0;
        let aiTokens = 500;
        let reportTokens = 250;
        if (shopCount >= 2) {
            aiTokens = 1000;
            reportTokens = 500;
        }

        return this.db.updateUser(user.id, { aiTokens, reportTokens });
    }

    async getDecryptedShopifyToken(userId: string): Promise<string | null> {
        const user = this.db.findUserById(userId);
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
        if (data.botSettings !== undefined) payload.botSettings = data.botSettings;
        if (data.language !== undefined) payload.language = data.language;
        if (data.currency !== undefined) payload.currency = data.currency;
        if (data.location !== undefined) payload.location = data.location;
        if (data.signInCount !== undefined) payload.signInCount = data.signInCount;
        if (data.lastLoginDate !== undefined) payload.lastLoginDate = data.lastLoginDate;
        if (data.loginDates !== undefined) payload.loginDates = data.loginDates;
        if (data.aiActionsUsed !== undefined) payload.aiActionsUsed = data.aiActionsUsed;
        if (data.aiActionsResetDate !== undefined) payload.aiActionsResetDate = data.aiActionsResetDate;

        return this.db.updateUser(userId, payload);
    }

    async setRefreshToken(userId: string, refreshToken: string) {
        return this.updateProfile(userId, { refreshToken });
    }

    async completeOnboarding(userId: string) {
        return this.updateProfile(userId, { isOnboardingComplete: true });
    }

    async getAllUsers() {
        return this.db.getAllUsers();
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
        const users = this.db.getAllUsers();
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let updatedCount = 0;

        for (const user of users) {
            const lastReset = user.lastTokenReset || 0;
            if (now - lastReset >= THIRTY_DAYS_MS) {
                const shopCount = user.shopifyStores?.length || 0;
                const aiTokens = shopCount >= 2 ? 1000 : 500;
                const reportTokens = shopCount >= 2 ? 500 : 250;

                this.db.updateUser(user.id, { aiTokens, reportTokens, lastTokenReset: now });
                updatedCount++;
            }
        }
        if (updatedCount > 0) {
            console.log(`[Tokens] Replenished tokens for ${updatedCount} users.`);
        }
    }

    async topUpTokens(userId: string, amount: number) {
        const user = this.db.findUserById(userId);
        if (!user) throw new Error('User not found');

        const updated = this.db.updateUser(userId, {
            aiTokens: user.aiTokens + amount
        });
        return { success: true, newBalance: updated.aiTokens };
    }

    async updateShopSettings(userId: string, storeId: string, settings: Partial<BotSettings>): Promise<ShopifyStore> {
        const store = this.db.findStoreById(storeId);
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

        return this.db.updateStore(storeId, { botSettings: newSettings });
    }

    async setStoreTarget(userId: string, storeId: string, type: 'weekly' | 'monthly', value: number): Promise<ShopifyStore> {
        const store = this.db.findStoreById(storeId);
        if (!store || store.userId !== userId) throw new Error('Store not found');
        return this.db.updateStore(storeId, { targetType: type, targetValue: value });
    }

    async getAiTokens(userId: string): Promise<number> {
        const user = await this.findById(userId);
        return user?.aiTokens || 0;
    }

    async increaseStoreLimit(userId: string): Promise<User> {
        const user = this.db.findUserById(userId);
        if (!user) throw new Error('User not found');
        return this.db.updateUser(userId, {
            storeLimit: user.storeLimit + 1
        });
    }

    async extendRetention(userId: string, months: number): Promise<User> {
        const user = this.db.findUserById(userId);
        if (!user) throw new Error('User not found');
        return this.db.updateUser(userId, {
            retentionMonths: user.retentionMonths + months
        });
    }

    async setFreeReports(userId: string, enable: boolean): Promise<User> {
        return this.db.updateUser(userId, { hasFreeReports: enable });
    }

    async setAllFreeReports(enable: boolean): Promise<number> {
        return this.db.updateManyUsers({ hasFreeReports: enable });
    }

    async deductReportToken(userId: string, amount: number = 1): Promise<User> {
        const user = await this.findById(userId);
        if (!user) throw new Error('User not found');
        if (user.hasFreeReports) return user;
        if (user.reportTokens < amount) throw new Error('Insufficient report tokens');

        return this.db.updateUser(userId, {
            reportTokens: user.reportTokens - amount
        });
    }
}
