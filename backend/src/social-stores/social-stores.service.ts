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

        // Check if there's a linked Shopify shop
        const shopifyStore = user.shopifyStores.find(s => s.id === user.activeShopId) || user.shopifyStores[0];

        if (shopifyStore) {
            return this.shopifyService.getProducts(shopifyStore.shop, shopifyStore.token, { first: 20 });
        }

        // Return unified local products for ALL social stores of this user
        let allProducts = [];
        for (const s of user.socialStores) {
            if (s.products) {
                for (const p of s.products) {
                    if (!allProducts.find(existing => existing.id === p.id)) {
                        allProducts.push(p);
                    }
                }
            }
        }

        return {
            products: allProducts,
            totalCount: allProducts.length
        };
    }

    async addProduct(id: string, productData: any): Promise<any> {
        const store = this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) throw new Error('Store not found');
        const user = this.jsonDatabaseService.findUserById(store.userId);

        const newProductId = `local_${Date.now()}`;
        const newProduct = {
            id: newProductId,
            title: productData.title || productData.name,
            product_type: productData.category || 'Uncategorized',
            images: productData.image ? [{ src: productData.image }] : [],
            variants: [{
                price: productData.price || '0.00',
                inventory_quantity: parseFloat(productData.stock) || 0
            }],
            status: 'active'
        };

        // Add to all social stores of the user so they share inventory
        if (user && user.socialStores) {
            for (const s of user.socialStores) {
                const products = s.products || [];
                products.push(newProduct);
                this.jsonDatabaseService.updateSocialStore(s.id, { products });
            }
        }
        return newProduct;
    }

    async editProduct(storeId: string, productId: string, data: any): Promise<any> {
        const store = this.jsonDatabaseService.findSocialStoreById(storeId);
        if (!store) throw new Error('Store not found');
        const user = this.jsonDatabaseService.findUserById(store.userId);

        if (user && user.socialStores) {
            for (const s of user.socialStores) {
                const products = s.products || [];
                const idx = products.findIndex(p => p.id === productId);
                if (idx !== -1) {
                    products[idx] = {
                        ...products[idx],
                        title: data.title || data.name || products[idx].title,
                        product_type: data.category || products[idx].product_type,
                        variants: [{
                            ...products[idx].variants[0],
                            price: data.price !== undefined ? data.price : products[idx].variants[0].price,
                            inventory_quantity: data.stock !== undefined ? parseFloat(data.stock) : products[idx].variants[0].inventory_quantity
                        }]
                    };
                    if (data.image) {
                        products[idx].images = [{ src: data.image }];
                    }
                    this.jsonDatabaseService.updateSocialStore(s.id, { products });
                }
            }
        }
        return { success: true };
    }

    async deleteProduct(storeId: string, productId: string): Promise<any> {
        const store = this.jsonDatabaseService.findSocialStoreById(storeId);
        if (!store) throw new Error('Store not found');
        const user = this.jsonDatabaseService.findUserById(store.userId);

        if (user && user.socialStores) {
            for (const s of user.socialStores) {
                const products = s.products || [];
                const newProducts = products.filter(p => p.id !== productId);
                this.jsonDatabaseService.updateSocialStore(s.id, { products: newProducts });
            }
        }
        return { success: true };
    }
}
