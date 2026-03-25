import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ShopifyStore {
    id: string;
    shop: string;
    token: string;
    name?: string;
    addedAt: string;
    botSettings?: any;
    targetType?: string;
    targetValue?: number;
    userId: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    password?: string;
    picture?: string;
    shopifyShop?: string;
    shopifyToken?: string;
    activeShopId?: string;
    storeLimit: number;
    retentionMonths: number;
    createdAt: string;
    isOnboardingComplete: boolean;
    refreshToken?: string;
    aiTokens: number;
    reportTokens: number;
    botSettings?: any;
    lastTokenReset?: number;
    hasFreeReports: boolean;
    language: string;
    pushSubscription?: any;
    ipAddress?: string;
    location?: string;
    currency?: string;
    signInCount: number;
    lastLoginDate?: string;
    loginDates: string[];
    shopifyStores: ShopifyStore[];
}

export interface Order {
    id: string;
    orderNumber: number;
    productName: string;
    productId?: string;
    quantity: number;
    price: number;
    totalPrice: number;
    customerName?: string;
    customerPhone?: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    userId: string;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

@Injectable()
export class JsonDbService implements OnModuleInit {
    private usersFilePath: string;
    private ordersFilePath: string;
    private writeLock: Promise<void> = Promise.resolve();

    onModuleInit() {
        const root = path.join(__dirname, '..', '..');
        this.usersFilePath = path.join(root, 'users.json');
        this.ordersFilePath = path.join(root, 'orders.json');

        if (!fs.existsSync(this.usersFilePath)) {
            fs.writeFileSync(this.usersFilePath, '[]', 'utf-8');
        }
        if (!fs.existsSync(this.ordersFilePath)) {
            fs.writeFileSync(this.ordersFilePath, '[]', 'utf-8');
        }
        console.log('[JsonDbService] Initialized with JSON file storage');
    }

    private readJson<T>(filePath: string): T[] {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    private async writeJson<T>(filePath: string, data: T[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.writeLock = this.writeLock.then(() => {
                try {
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    // ===== USER OPERATIONS =====

    async getUsers(): Promise<User[]> {
        return this.readJson<User>(this.usersFilePath);
    }

    async findUserByEmail(email: string): Promise<User | null> {
        const users = await this.getUsers();
        return users.find(u => u.email === email) || null;
    }

    async findUserById(id: string): Promise<User | null> {
        const users = await this.getUsers();
        return users.find(u => u.id === id) || null;
    }

    async createUser(data: Partial<User> & { email: string; name: string }): Promise<User> {
        const users = await this.getUsers();
        const newUser: User = {
            id: data.id || generateId(),
            email: data.email,
            name: data.name,
            password: data.password || undefined,
            picture: data.picture || undefined,
            shopifyShop: data.shopifyShop || undefined,
            shopifyToken: data.shopifyToken || undefined,
            activeShopId: data.activeShopId || undefined,
            storeLimit: data.storeLimit ?? 2,
            retentionMonths: data.retentionMonths ?? 3,
            createdAt: data.createdAt || new Date().toISOString(),
            isOnboardingComplete: data.isOnboardingComplete ?? false,
            refreshToken: data.refreshToken || undefined,
            aiTokens: data.aiTokens ?? 500,
            reportTokens: data.reportTokens ?? 250,
            botSettings: data.botSettings || undefined,
            lastTokenReset: data.lastTokenReset || undefined,
            hasFreeReports: data.hasFreeReports ?? false,
            language: data.language || 'en',
            pushSubscription: data.pushSubscription || undefined,
            ipAddress: data.ipAddress || undefined,
            location: data.location || undefined,
            currency: data.currency || undefined,
            signInCount: data.signInCount ?? 0,
            lastLoginDate: data.lastLoginDate || undefined,
            loginDates: data.loginDates || [],
            shopifyStores: data.shopifyStores || [],
        };
        users.push(newUser);
        await this.writeJson(this.usersFilePath, users);
        return newUser;
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');

        const user = users[index];
        const updated = { ...user, ...data, id: user.id };
        users[index] = updated;
        await this.writeJson(this.usersFilePath, users);
        return updated;
    }

    async updateAllUsers(updates: Partial<User>): Promise<number> {
        const users = await this.getUsers();
        let count = 0;
        for (let i = 0; i < users.length; i++) {
            users[i] = { ...users[i], ...updates, id: users[i].id };
            count++;
        }
        await this.writeJson(this.usersFilePath, users);
        return count;
    }

    async incrementUserField(id: string, field: 'aiTokens' | 'reportTokens' | 'storeLimit' | 'retentionMonths' | 'signInCount', amount: number): Promise<User> {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');

        (users[index][field] as number) = ((users[index][field] as number) || 0) + amount;
        await this.writeJson(this.usersFilePath, users);
        return users[index];
    }

    async decrementUserField(id: string, field: 'aiTokens' | 'reportTokens', amount: number): Promise<User> {
        return this.incrementUserField(id, field, -amount);
    }

    // ===== SHOPIFY STORE OPERATIONS (embedded in user) =====

    async findStoreById(storeId: string): Promise<(ShopifyStore & { _userIndex?: number }) | null> {
        const users = await this.getUsers();
        for (const user of users) {
            const store = (user.shopifyStores || []).find(s => s.id === storeId);
            if (store) return store;
        }
        return null;
    }

    async addStoreToUser(userId: string, storeData: Omit<ShopifyStore, 'id' | 'userId'>): Promise<ShopifyStore> {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) throw new Error('User not found');

        const store: ShopifyStore = {
            id: generateId(),
            ...storeData,
            userId,
        };

        if (!users[index].shopifyStores) users[index].shopifyStores = [];
        users[index].shopifyStores.push(store);
        await this.writeJson(this.usersFilePath, users);
        return store;
    }

    async updateStore(storeId: string, data: Partial<ShopifyStore>): Promise<ShopifyStore> {
        const users = await this.getUsers();
        for (const user of users) {
            const storeIndex = (user.shopifyStores || []).findIndex(s => s.id === storeId);
            if (storeIndex !== -1) {
                user.shopifyStores[storeIndex] = {
                    ...user.shopifyStores[storeIndex],
                    ...data,
                    id: storeId,
                };
                await this.writeJson(this.usersFilePath, users);
                return user.shopifyStores[storeIndex];
            }
        }
        throw new Error('Store not found');
    }

    async deleteStore(storeId: string): Promise<void> {
        const users = await this.getUsers();
        for (const user of users) {
            const storeIndex = (user.shopifyStores || []).findIndex(s => s.id === storeId);
            if (storeIndex !== -1) {
                user.shopifyStores.splice(storeIndex, 1);
                await this.writeJson(this.usersFilePath, users);
                return;
            }
        }
        throw new Error('Store not found');
    }

    async deleteAllStoresForUser(userId: string): Promise<void> {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) throw new Error('User not found');
        users[index].shopifyStores = [];
        await this.writeJson(this.usersFilePath, users);
    }

    // ===== ORDER OPERATIONS =====

    async getOrders(): Promise<Order[]> {
        return this.readJson<Order>(this.ordersFilePath);
    }

    async findOrderById(id: string): Promise<Order | null> {
        const orders = await this.getOrders();
        return orders.find(o => o.id === id) || null;
    }

    async findOrdersByUser(userId: string): Promise<Order[]> {
        const orders = await this.getOrders();
        return orders
            .filter(o => o.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async findLastOrderByUser(userId: string): Promise<Order | null> {
        const orders = await this.getOrders();
        const userOrders = orders
            .filter(o => o.userId === userId)
            .sort((a, b) => b.orderNumber - a.orderNumber);
        return userOrders[0] || null;
    }

    async createOrder(data: Omit<Order, 'id'>): Promise<Order> {
        const orders = await this.getOrders();
        const order: Order = {
            id: generateId(),
            ...data,
        };
        orders.push(order);
        await this.writeJson(this.ordersFilePath, orders);
        return order;
    }

    async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
        const orders = await this.getOrders();
        const index = orders.findIndex(o => o.id === id);
        if (index === -1) throw new Error('Order not found');

        orders[index] = { ...orders[index], ...data, id };
        await this.writeJson(this.ordersFilePath, orders);
        return orders[index];
    }

    async deleteOrder(id: string): Promise<Order> {
        const orders = await this.getOrders();
        const index = orders.findIndex(o => o.id === id);
        if (index === -1) throw new Error('Order not found');

        const [deleted] = orders.splice(index, 1);
        await this.writeJson(this.ordersFilePath, orders);
        return deleted;
    }
}
