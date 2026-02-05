import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EncryptionService } from '../common/encryption.service';

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

export interface ShopifyStore {
    id: string;           // Unique ID for this store connection
    shop: string;         // e.g., "my-store.myshopify.com"
    token: string;        // Encrypted access token
    name?: string;        // Display name (optional)
    addedAt: string;      // ISO timestamp
    botSettings?: BotSettings; // Shop-specific bot settings
}

export interface User {
    id: string;
    email: string;
    name: string;
    password?: string; // Hashed password
    picture?: string;
    // Legacy fields (kept for migration, will be removed eventually)
    shopifyShop?: string;
    shopifyToken?: string;
    // New multi-shop fields
    shopifyStores?: ShopifyStore[];
    activeShopId?: string;
    storeLimit?: number; // Max allowed shops
    retentionMonths?: number; // Data retention period in months
    createdAt?: string;
    isOnboardingComplete?: boolean;
    refreshToken?: string;
    aiTokens?: number;
    reportTokens?: number;
    botSettings?: BotSettings; // Legacy global settings (migration source)
    lastTokenReset?: number;
    hasFreeReports?: boolean;
    language?: 'en' | 'fr';
}

@Injectable()
export class UsersService implements OnModuleInit {
    private users: Map<string, User> = new Map();
    private readonly filePath = path.join(process.cwd(), 'users.json');
    constructor(
        private readonly encryptionService: EncryptionService
    ) { }

    onModuleInit() {
        this.loadUsers();
    }

    private loadUsers() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const usersArray = JSON.parse(data);
                this.users = new Map(usersArray.map((user: User) => {
                    // Migration: Ensure new fields exist
                    if (user.aiTokens === undefined) user.aiTokens = 500;
                    if (user.reportTokens === undefined) user.reportTokens = 250;
                    if (user.storeLimit === undefined) user.storeLimit = 2; // Default limit
                    if (user.retentionMonths === undefined) user.retentionMonths = 3; // Default retention
                    if (user.lastTokenReset === undefined) user.lastTokenReset = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();

                    // Migration: Convert legacy single-shop to multi-shop format
                    if (user.shopifyShop && user.shopifyToken && !user.shopifyStores) {
                        const storeId = crypto.randomBytes(4).toString('hex');
                        user.shopifyStores = [{
                            id: storeId,
                            shop: user.shopifyShop,
                            token: user.shopifyToken,
                            addedAt: user.createdAt || new Date().toISOString(),
                            botSettings: user.botSettings // Move global settings to first shop
                        }];
                        user.activeShopId = storeId;
                        console.log(`[Migration] Converted single-shop user ${user.id} to multi-shop format`);
                    }

                    // Migration: Move global botSettings to shop-specific if they exist and shops exist but no shop settings
                    if (user.botSettings && user.shopifyStores && user.shopifyStores.length > 0) {
                        user.shopifyStores.forEach(store => {
                            if (!store.botSettings) {
                                store.botSettings = { ...user.botSettings };
                                console.log(`[Migration] Moved botSettings to shop ${store.shop} for user ${user.id}`);
                            }
                        });
                        // We can delete user.botSettings but keeping it for safety for now is okay, 
                        // or we can remove it to verify migration is done. Let's keep it optional.
                    }

                    // Initialize empty array if no stores
                    if (!user.shopifyStores) {
                        user.shopifyStores = [];
                    }

                    return [user.id, user];
                }));
                console.log(`Loaded ${this.users.size} users from ${this.filePath}`);
                this.saveUsers(); // Save migrated data
            } catch (error) {
                console.error('Error loading users from file:', error);
            }
        }
    }

    private saveUsers() {
        try {
            const usersArray = Array.from(this.users.values());
            fs.writeFileSync(this.filePath, JSON.stringify(usersArray, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving users to file:', error);
        }
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find(user => user.email === email);
    }

    async createOrFind(profile: any): Promise<User> {
        const email = profile.emails[0].value;
        let user = await this.findByEmail(email);

        if (!user) {
            user = {
                id: profile.id || Math.random().toString(36).substr(2, 9),
                email,
                name: profile.displayName,
                picture: profile.photos?.[0]?.value,
                isOnboardingComplete: false,
                aiTokens: 500,
                reportTokens: 250,
                storeLimit: 2, // Default limit
                hasFreeReports: false,
                language: 'en',
                createdAt: new Date().toISOString(),
            };
            this.users.set(user.id, user);
            this.saveUsers();
        }
        return user;
    }

    async createUser(email: string, name: string, passwordHash: string): Promise<User> {
        const existing = await this.findByEmail(email);
        if (existing) throw new Error('User already exists');

        const user: User = {
            id: Math.random().toString(36).substr(2, 9),
            email,
            name,
            password: passwordHash,
            isOnboardingComplete: false,
            aiTokens: 500,
            reportTokens: 250,
            storeLimit: 2, // Default limit
            hasFreeReports: false,
            language: 'en',
            createdAt: new Date().toISOString(),
        };
        this.users.set(user.id, user);
        this.saveUsers();
        return user;
    }

    async findById(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    async updateShopifyCredentials(userId: string, shop: string, token: string): Promise<User> {
        // Redirect to addShopifyStore for backward compatibility
        return this.addShopifyStore(userId, shop, token);
    }

    /**
     * Add a new Shopify store to the user's account.
     * Recalculates tokens based on shop count.
     */
    async addShopifyStore(userId: string, shop: string, token: string, name?: string): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        // Check if shop already exists
        if (!user.shopifyStores) user.shopifyStores = [];
        const existingStore = user.shopifyStores.find(s => s.shop === shop);
        if (existingStore) {
            // Update existing store's token
            existingStore.token = this.encryptionService.encrypt(token);
            this.users.set(userId, user);
            this.saveUsers();
            return user;
        }

        // Add new store
        const storeId = crypto.randomBytes(4).toString('hex');
        // Check Store Limit
        // If shop is NEW (not updating existing), check limit.
        if (user.shopifyStores.length >= (user.storeLimit || 2)) {
            throw new Error('Store limit reached. Please upgrade to add more stores.');
        }

        user.shopifyStores.push({
            id: storeId,
            shop,
            token: this.encryptionService.encrypt(token),
            name: name || shop.replace('.myshopify.com', ''),
            addedAt: new Date().toISOString(),
        });

        // Set as active if it's the first store
        if (!user.activeShopId) {
            user.activeShopId = storeId;
        }

        // Update legacy fields for backward compatibility
        user.shopifyShop = shop;
        user.shopifyToken = this.encryptionService.encrypt(token);

        // Token scaling: 2+ shops = double tokens
        this.recalculateTokens(user);

        this.users.set(userId, user);
        this.saveUsers();
        console.log(`[MultiShop] Added store ${shop} for user ${userId}. Total stores: ${user.shopifyStores.length}`);
        return user;
    }

    /**
     * Remove a Shopify store from the user's account.
     */
    async removeShopifyStore(userId: string, storeId: string): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        if (!user.shopifyStores) user.shopifyStores = [];
        user.shopifyStores = user.shopifyStores.filter(s => s.id !== storeId);

        // If removed store was active, switch to first remaining or clear
        if (user.activeShopId === storeId) {
            user.activeShopId = user.shopifyStores[0]?.id;
        }

        // Update legacy fields
        const activeStore = this.getActiveStoreSync(user);
        user.shopifyShop = activeStore?.shop;
        user.shopifyToken = activeStore?.token;

        // Recalculate tokens
        this.recalculateTokens(user);

        this.users.set(userId, user);
        this.saveUsers();
        console.log(`[MultiShop] Removed store ${storeId} for user ${userId}. Total stores: ${user.shopifyStores.length}`);
        return user;
    }

    async removeShopifyCredentials(userId: string): Promise<User> {
        const user = this.users.get(userId);
        if (user) {
            // Remove active store or all stores
            if (user.activeShopId) {
                return this.removeShopifyStore(userId, user.activeShopId);
            }
            user.shopifyShop = undefined;
            user.shopifyToken = undefined;
            user.shopifyStores = [];
            user.activeShopId = undefined;
            this.recalculateTokens(user);
            this.users.set(userId, user);
            this.saveUsers();
            return user;
        }
        throw new Error('User not found');
    }

    /**
     * Set the active shop for a user.
     */
    async setActiveShop(userId: string, storeId: string): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        const store = user.shopifyStores?.find(s => s.id === storeId);
        if (!store) throw new Error('Store not found');

        user.activeShopId = storeId;

        // Update legacy fields for backward compatibility
        user.shopifyShop = store.shop;
        user.shopifyToken = store.token;

        this.users.set(userId, user);
        this.saveUsers();
        console.log(`[MultiShop] Set active shop to ${store.shop} for user ${userId}`);
        return user;
    }

    /**
     * Get the active store for a user.
     */
    async getActiveShop(userId: string): Promise<ShopifyStore | undefined> {
        const user = this.users.get(userId);
        if (!user) return undefined;
        return this.getActiveStoreSync(user);
    }

    private getActiveStoreSync(user: User): ShopifyStore | undefined {
        if (!user.shopifyStores || user.shopifyStores.length === 0) return undefined;
        if (user.activeShopId) {
            return user.shopifyStores.find(s => s.id === user.activeShopId);
        }
        return user.shopifyStores[0];
    }

    /**
     * Recalculate tokens based on shop count.
     * 1 shop = base tokens, 2+ shops = double tokens
     */
    private recalculateTokens(user: User) {
        const shopCount = user.shopifyStores?.length || 0;
        if (shopCount >= 2) {
            user.aiTokens = 1000;
            user.reportTokens = 500;
        } else {
            user.aiTokens = 500;
            user.reportTokens = 250;
        }
        console.log(`[Tokens] User ${user.id} now has ${shopCount} shops, tokens: AI=${user.aiTokens}, Report=${user.reportTokens}`);
    }

    async getDecryptedShopifyToken(userId: string): Promise<string | undefined> {
        const user = this.users.get(userId);
        if (user && user.shopifyToken) {
            return this.encryptionService.decrypt(user.shopifyToken);
        }
        return undefined;
    }

    async updateProfile(userId: string, data: Partial<User>): Promise<User> {
        const user = this.users.get(userId);
        if (user) {
            if (data.name) user.name = data.name;
            if (data.email) user.email = data.email; // Caution: verify uniqueness if real DB
            if (data.password) user.password = data.password;
            if (data.isOnboardingComplete !== undefined) user.isOnboardingComplete = data.isOnboardingComplete;
            if (data.refreshToken !== undefined) user.refreshToken = data.refreshToken;
            if (data.aiTokens !== undefined) user.aiTokens = data.aiTokens;
            if (data.reportTokens !== undefined) user.reportTokens = data.reportTokens;
            if (data.botSettings !== undefined) user.botSettings = data.botSettings;
            if (data.language !== undefined) user.language = data.language as 'en' | 'fr';

            this.users.set(userId, user);
            this.saveUsers();
            return user;
        }
        throw new Error('User not found');
    }

    async setRefreshToken(userId: string, refreshToken: string) {
        return this.updateProfile(userId, { refreshToken });
    }

    async completeOnboarding(userId: string) {
        return this.updateProfile(userId, { isOnboardingComplete: true });
    }


    // New method to expose all users for Cron jobs
    async getAllUsers(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    // Keeping the original mock data method for dashboard compatibility if needed, 
    // but ideally we should move away from this.
    // For now, I'll keep it to avoid breaking other parts.
    findAll() {
        return {
            users: [
                { id: 1, name: 'Alex Johnson', email: 'alex@example.com', status: 'active', plan: 'Premium', lastActive: '2 hours ago', location: 'New York', signupDate: '2024-01-15', avatar: 'AJ' },
                { id: 2, name: 'Sarah Wilson', email: 'sarah@example.com', status: 'active', plan: 'Pro', lastActive: '5 minutes ago', location: 'London', signupDate: '2024-01-10', avatar: 'SW' },
                { id: 3, name: 'Mike Brown', email: 'mike@example.com', status: 'inactive', plan: 'Free', lastActive: '2 days ago', location: 'Toronto', signupDate: '2023-12-20', avatar: 'MB' },
                { id: 4, name: 'Emma Davis', email: 'emma@example.com', status: 'active', plan: 'Premium', lastActive: '1 hour ago', location: 'Sydney', signupDate: '2024-01-05', avatar: 'ED' },
                { id: 5, name: 'James Wilson', email: 'james@example.com', status: 'active', plan: 'Enterprise', lastActive: 'Just now', location: 'San Francisco', signupDate: '2024-01-12', avatar: 'JW' },
                { id: 6, name: 'Lisa Chen', email: 'lisa@example.com', status: 'inactive', plan: 'Free', lastActive: '1 week ago', location: 'Singapore', signupDate: '2023-11-30', avatar: 'LC' }
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
        console.log('[Tokens] Checking for monthly replenishment...');
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let updatedCount = 0;

        for (const user of this.users.values()) {
            const lastReset = user.lastTokenReset || 0; // Default to 0 (epoch) if missing so it resets immediately

            // If it's been more than 30 days since last reset
            if (now - lastReset >= THIRTY_DAYS_MS) {
                // Determine base tokens based on shop count
                const shopCount = user.shopifyStores?.length || 0;
                const baseAiTokens = shopCount >= 2 ? 1000 : 500;

                // Only reset if they have fewer than base tokens
                user.aiTokens = baseAiTokens;
                user.reportTokens = shopCount >= 2 ? 500 : 250;
                user.lastTokenReset = now;

                this.users.set(user.id, user);
                updatedCount++;
                console.log(`[Tokens] Replenished tokens for user ${user.id}`);
            }
        }

        if (updatedCount > 0) {
            this.saveUsers();
            console.log(`[Tokens] Replenished tokens for ${updatedCount} users.`);
        }
    }

    async topUpTokens(userId: string, amount: number) {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        user.aiTokens = (user.aiTokens || 0) + amount;
        this.users.set(userId, user);
        this.saveUsers();
        return { success: true, newBalance: user.aiTokens };
    }

    async updateShopSettings(userId: string, storeId: string, settings: Partial<BotSettings>): Promise<ShopifyStore> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        const store = user.shopifyStores?.find(s => s.id === storeId);
        if (!store) throw new Error('Store not found');

        store.botSettings = {
            ...(store.botSettings || {
                name: 'Analytics Assistant',
                personality: 'Professional',
                responseSpeed: 'Medium',
                theme: 'Blue',
                language: 'English',
                notifications: true,
                voiceEnabled: false,
                dataAccess: 'Limited',
                autoRespond: true
            }),
            ...settings
        };

        this.users.set(userId, user);
        this.saveUsers();
        return store;
    }
    async getAiTokens(userId: string): Promise<number> {
        const user = this.users.get(userId);
        return user?.aiTokens || 0;
    }

    async increaseStoreLimit(userId: string): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        user.storeLimit = (user.storeLimit || 2) + 1;
        this.users.set(userId, user);
        this.saveUsers();
        console.log(`[Limits] User ${userId} increased store limit to ${user.storeLimit}`);
        return user;
    }
    async extendRetention(userId: string, months: number): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        user.retentionMonths = (user.retentionMonths || 3) + months;
        this.users.set(userId, user);
        this.saveUsers();
        console.log(`[Retention] User ${userId} extended retention by ${months} months. New limit: ${user.retentionMonths}`);
        return user;
    }

    async setFreeReports(userId: string, enable: boolean): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');
        user.hasFreeReports = enable;
        this.users.set(userId, user);
        this.saveUsers();
        console.log(`[Admin] Set free reports for user ${userId} to ${enable}`);
        return user;
    }

    async setAllFreeReports(enable: boolean): Promise<number> {
        let count = 0;
        for (const user of this.users.values()) {
            user.hasFreeReports = enable;
            this.users.set(user.id, user);
            count++;
        }
        this.saveUsers();
        console.log(`[Admin] Set free reports for ALL ${count} users to ${enable}`);
        return count;
    }

    async deductReportToken(userId: string, amount: number = 1): Promise<User> {
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        if (user.hasFreeReports) {
            console.log(`[Tokens] User ${userId} has free reports, skipping deduction.`);
            return user;
        }

        if ((user.reportTokens || 0) < amount) {
            throw new Error('Insufficient report tokens');
        }

        user.reportTokens = (user.reportTokens || 0) - amount;
        this.users.set(userId, user);
        this.saveUsers();
        return user;
    }
}
