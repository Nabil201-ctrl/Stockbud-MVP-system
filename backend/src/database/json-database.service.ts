import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { User, ShopifyStore } from './interfaces';

@Injectable()
export class JsonDatabaseService implements OnModuleInit {
    private users: User[] = [];
    private readonly usersFilePath = path.join(process.cwd(), 'data', 'users.json');
    private readonly storesFilePath = path.join(process.cwd(), 'data', 'shopify_stores.json');

    async onModuleInit() {
        this.ensureDataDir();
        this.loadData();
        console.log(`[JsonDB] Loaded ${this.users.length} users from JSON files.`);
    }

    private ensureDataDir() {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.usersFilePath)) {
            fs.writeFileSync(this.usersFilePath, '[]', 'utf8');
        }
        if (!fs.existsSync(this.storesFilePath)) {
            fs.writeFileSync(this.storesFilePath, '[]', 'utf8');
        }
    }

    private loadData() {
        try {
            const usersRaw = fs.readFileSync(this.usersFilePath, 'utf8');
            this.users = JSON.parse(usersRaw);

            const storesRaw = fs.readFileSync(this.storesFilePath, 'utf8');
            const stores: ShopifyStore[] = JSON.parse(storesRaw);

            for (const user of this.users) {
                if (!user.shopifyStores) {
                    user.shopifyStores = stores.filter(s => s.userId === user.id);
                }
            }
        } catch (error) {
            console.error('[JsonDB] Error loading data:', error);
            this.users = [];
        }
    }

    private saveUsers() {
        try {
            const usersToSave = this.users.map(u => ({ ...u }));
            fs.writeFileSync(this.usersFilePath, JSON.stringify(usersToSave, null, 2), 'utf8');

            const allStores: ShopifyStore[] = [];
            for (const user of this.users) {
                if (user.shopifyStores) {
                    allStores.push(...user.shopifyStores);
                }
            }
            fs.writeFileSync(this.storesFilePath, JSON.stringify(allStores, null, 2), 'utf8');
        } catch (error) {
            console.error('[JsonDB] Error saving data:', error);
        }
    }

    private generateId(): string {
        return crypto.randomBytes(8).toString('hex');
    }

    private createDefaultUser(data: Partial<User>): User {
        return {
            id: data.id || this.generateId(),
            email: data.email || '',
            name: data.name || '',
            password: data.password || null,
            picture: data.picture || null,
            shopifyShop: data.shopifyShop || null,
            shopifyToken: data.shopifyToken || null,
            activeShopId: data.activeShopId || null,
            storeLimit: data.storeLimit ?? 2,
            retentionMonths: data.retentionMonths ?? 3,
            createdAt: data.createdAt || new Date().toISOString(),
            isOnboardingComplete: data.isOnboardingComplete ?? false,
            refreshToken: data.refreshToken || null,
            aiTokens: data.aiTokens ?? 500,
            reportTokens: data.reportTokens ?? 250,
            botSettings: data.botSettings || null,
            lastTokenReset: data.lastTokenReset || null,
            hasFreeReports: data.hasFreeReports ?? false,
            language: data.language || 'en',
            pushSubscription: data.pushSubscription || null,
            ipAddress: data.ipAddress || null,
            location: data.location || null,
            currency: data.currency || null,
            signInCount: data.signInCount ?? 0,
            lastLoginDate: data.lastLoginDate || null,
            loginDates: data.loginDates || [],
            shopifyStores: data.shopifyStores || [],
        };
    }

    findUserByEmail(email: string): User | null {
        return this.users.find(u => u.email === email) || null;
    }

    findUserById(id: string): User | null {
        return this.users.find(u => u.id === id) || null;
    }

    createUser(data: Partial<User>): User {
        const user = this.createDefaultUser(data);
        this.users.push(user);
        this.saveUsers();
        return user;
    }

    updateUser(id: string, data: Partial<User>): User {
        const idx = this.users.findIndex(u => u.id === id);
        if (idx === -1) throw new Error('User not found');

        const user = this.users[idx];

        for (const [key, value] of Object.entries(data)) {
            if (key === 'id' || key === 'shopifyStores') continue;

            if (value !== undefined) {
                if (typeof value === 'object' && value !== null && 'increment' in value) {
                    (user as any)[key] = ((user as any)[key] || 0) + (value as any).increment;
                } else if (typeof value === 'object' && value !== null && 'decrement' in value) {
                    (user as any)[key] = ((user as any)[key] || 0) - (value as any).decrement;
                } else {
                    (user as any)[key] = value;
                }
            }
        }

        this.users[idx] = user;
        this.saveUsers();
        return user;
    }

    updateManyUsers(data: Partial<User>): number {
        let count = 0;
        for (let i = 0; i < this.users.length; i++) {
            for (const [key, value] of Object.entries(data)) {
                if (key === 'id' || key === 'shopifyStores') continue;
                if (value !== undefined) {
                    (this.users[i] as any)[key] = value;
                }
            }
            count++;
        }
        this.saveUsers();
        return count;
    }

    getAllUsers(): User[] {
        return [...this.users];
    }

    findStoreById(storeId: string): ShopifyStore | null {
        for (const user of this.users) {
            const store = user.shopifyStores.find(s => s.id === storeId);
            if (store) return store;
        }
        return null;
    }

    createStore(userId: string, data: Partial<ShopifyStore>): ShopifyStore {
        const user = this.findUserById(userId);
        if (!user) throw new Error('User not found');

        const store: ShopifyStore = {
            id: data.id || this.generateId(),
            shop: data.shop || '',
            token: data.token || '',
            name: data.name || null,
            addedAt: data.addedAt || new Date().toISOString(),
            botSettings: data.botSettings || null,
            targetType: data.targetType || null,
            targetValue: data.targetValue || null,
            userId,
        };

        user.shopifyStores.push(store);
        this.saveUsers();
        return store;
    }

    updateStore(storeId: string, data: Partial<ShopifyStore>): ShopifyStore {
        for (const user of this.users) {
            const idx = user.shopifyStores.findIndex(s => s.id === storeId);
            if (idx !== -1) {
                const store = user.shopifyStores[idx];
                for (const [key, value] of Object.entries(data)) {
                    if (key === 'id' || key === 'userId') continue;
                    if (value !== undefined) {
                        (store as any)[key] = value;
                    }
                }
                user.shopifyStores[idx] = store;
                this.saveUsers();
                return store;
            }
        }
        throw new Error('Store not found');
    }

    deleteStore(storeId: string): void {
        for (const user of this.users) {
            const idx = user.shopifyStores.findIndex(s => s.id === storeId);
            if (idx !== -1) {
                user.shopifyStores.splice(idx, 1);
                this.saveUsers();
                return;
            }
        }
        throw new Error('Store not found');
    }

    deleteStoresByUserId(userId: string): void {
        const user = this.findUserById(userId);
        if (user) {
            user.shopifyStores = [];
            this.saveUsers();
        }
    }
}
