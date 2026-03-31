import { Injectable } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { SocialStore } from '../database/interfaces';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class SocialStoresService {
    constructor(
        private readonly jsonDatabaseService: JsonDatabaseService,
        private readonly shopifyService: ShopifyService
    ) { }

    async findAll(userId: string): Promise<SocialStore[]> {
        const user = this.jsonDatabaseService.findUserById(userId);
        return user?.socialStores || [];
    }

    async create(userId: string, data: Partial<SocialStore>): Promise<SocialStore> {
        return this.jsonDatabaseService.createSocialStore(userId, data);
    }

    async update(id: string, data: Partial<SocialStore>): Promise<SocialStore> {
        return this.jsonDatabaseService.updateSocialStore(id, data);
    }

    async delete(id: string): Promise<void> {
        this.jsonDatabaseService.deleteSocialStore(id);
    }

    async findById(id: string): Promise<SocialStore | null> {
        return this.jsonDatabaseService.findSocialStoreById(id);
    }

    async recordVisit(id: string): Promise<void> {
        const store = this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) return;

        const date = new Date().toISOString().split('T')[0];

        let stats = store.dailyStats || [];
        const idx = stats.findIndex(s => s.date === date);

        if (idx !== -1) {
            stats[idx].visits += 1;
        } else {
            stats.push({ date, visits: 1, inquiries: 0 });
        }

        // Keep only last 30 days of stats
        if (stats.length > 30) stats.shift();

        this.jsonDatabaseService.updateSocialStore(id, {
            visits: (store.visits || 0) + 1,
            dailyStats: stats
        });
    }

    async recordInquiry(id: string): Promise<void> {
        const store = this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) return;

        const date = new Date().toISOString().split('T')[0];

        let stats = store.dailyStats || [];
        const idx = stats.findIndex(s => s.date === date);

        if (idx !== -1) {
            stats[idx].inquiries = (stats[idx].inquiries || 0) + 1;
        } else {
            stats.push({ date, visits: 0, inquiries: 1 });
        }

        if (stats.length > 30) stats.shift();

        this.jsonDatabaseService.updateSocialStore(id, {
            inquiries: (store.inquiries || 0) + 1,
            dailyStats: stats
        });
    }

    async getStats(id: string): Promise<any> {
        const store = this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) throw new Error('Store not found');

        // Last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const chartData = last7Days.map(date => {
            const dayData = (store.dailyStats || []).find(s => s.date === date);
            return {
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
                visits: dayData ? dayData.visits : 0,
                inquiries: dayData ? (dayData.inquiries || 0) : 0
            };
        });

        return {
            totalVisits: store.visits,
            totalInquiries: store.inquiries || 0,
            chartData
        };
    }

    async getProducts(id: string): Promise<any> {
        const store = this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) throw new Error('Store not found');

        const user = this.jsonDatabaseService.findUserById(store.userId);
        if (!user) throw new Error('User not found');

        // Use the active Shopify store or the first one available
        const shopifyStore = user.shopifyStores.find(s => s.id === user.activeShopId) || user.shopifyStores[0];

        if (!shopifyStore) {
            return { products: [], totalCount: 0 };
        }

        return this.shopifyService.getProducts(shopifyStore.shop, shopifyStore.token, { first: 20 });
    }
}
