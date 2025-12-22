import { Injectable } from '@nestjs/common';

export interface User {
    id: string;
    email: string;
    name: string;
    password?: string; // Hashed password
    picture?: string;
    shopifyShop?: string;
    shopifyToken?: string;
}

@Injectable()
export class UsersService {
    private users: Map<string, User> = new Map();

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
            };
            this.users.set(user.id, user);
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
        };
        this.users.set(user.id, user);
        return user;
    }

    async findById(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    async updateShopifyCredentials(userId: string, shop: string, token: string): Promise<User> {
        const user = this.users.get(userId);
        if (user) {
            user.shopifyShop = shop;
            user.shopifyToken = token;
            this.users.set(userId, user);
            return user;
        }
        throw new Error('User not found');
    }

    async updateProfile(userId: string, data: Partial<User>): Promise<User> {
        const user = this.users.get(userId);
        if (user) {
            if (data.name) user.name = data.name;
            if (data.email) user.email = data.email; // Caution: verify uniqueness if real DB
            if (data.password) user.password = data.password;

            this.users.set(userId, user);
            return user;
        }
        throw new Error('User not found');
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
