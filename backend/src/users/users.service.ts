import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EncryptionService } from '../common/encryption.service';

export interface User {
    id: string;
    email: string;
    name: string;
    password?: string; // Hashed password
    picture?: string;
    shopifyShop?: string;
    shopifyToken?: string;
    createdAt?: string;
    isOnboardingComplete?: boolean;
    refreshToken?: string;
    aiTokens?: number;
    reportTokens?: number;
    botSettings?: {
        name: string;
        personality: string;
        responseSpeed: string;
        theme: string;
        language: string;
        notifications: boolean;
        voiceEnabled: boolean;
        dataAccess: string;
        autoRespond: boolean;
    };
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
                    return [user.id, user];
                }));
                console.log(`Loaded ${this.users.size} users from ${this.filePath}`);
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
        const user = this.users.get(userId);
        if (user) {
            user.shopifyShop = shop;
            // Encrypt token before saving
            user.shopifyToken = this.encryptionService.encrypt(token);
            this.users.set(userId, user);
            this.saveUsers();
            return user;
        }
        throw new Error('User not found');
    }

    async removeShopifyCredentials(userId: string): Promise<User> {
        const user = this.users.get(userId);
        if (user) {
            user.shopifyShop = undefined;
            user.shopifyToken = undefined;
            this.users.set(userId, user);
            this.saveUsers();
            return user;
        }
        throw new Error('User not found');
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
}
