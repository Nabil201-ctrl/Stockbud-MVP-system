import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SocialStore } from '@prisma/client';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class SocialStoresService {
    constructor(
        private readonly jsonDatabaseService: PrismaService,
        private readonly shopifyService: ShopifyService
    ) { }

    async findAll(userId: string): Promise<SocialStore[]> {
        const user = await this.jsonDatabaseService.findUserById(userId);
        return (user as any)?.socialStores || [];
    }

    async create(userId: string, data: Partial<SocialStore>): Promise<SocialStore> {
        return await this.jsonDatabaseService.createSocialStore(userId, data);
    }

    async update(userId: string, id: string, data: Partial<SocialStore>): Promise<SocialStore> {
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');

        // Prevent manual override of sensitive fields
        delete data.userId;
        delete data.visits;
        delete data.inquiries;
        delete data.dailyStats;

        return await this.jsonDatabaseService.updateSocialStore(id, data);
    }

    async delete(userId: string, id: string): Promise<void> {
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');
        await this.jsonDatabaseService.deleteSocialStore(id);
    }

    async findById(id: string): Promise<SocialStore | null> {
        return await this.jsonDatabaseService.findSocialStoreById(id);
    }

    async recordVisit(id: string): Promise<void> {
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) return;

        const date = new Date().toISOString().split('T')[0];

        let stats: any[] = Array.isArray(store.dailyStats) ? store.dailyStats : [];
        const idx = stats.findIndex(s => s.date === date);

        if (idx !== -1) {
            stats[idx].visits += 1;
        } else {
            stats.push({ date, visits: 1, inquiries: 0 });
        }

        // Keep only last 30 days of stats
        if (stats.length > 30) stats.shift();

        await this.jsonDatabaseService.updateSocialStore(id, {
            visits: (store.visits || 0) + 1,
            dailyStats: stats
        });
    }

    async recordInquiry(id: string): Promise<void> {
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) return;

        const date = new Date().toISOString().split('T')[0];

        let stats: any[] = Array.isArray(store.dailyStats) ? store.dailyStats : [];
        const idx = stats.findIndex(s => s.date === date);

        if (idx !== -1) {
            stats[idx].inquiries = (stats[idx].inquiries || 0) + 1;
        } else {
            stats.push({ date, visits: 0, inquiries: 1 });
        }

        if (stats.length > 30) stats.shift();

        await this.jsonDatabaseService.updateSocialStore(id, {
            inquiries: (store.inquiries || 0) + 1,
            dailyStats: stats
        });
    }

    async getStats(userId: string, id: string): Promise<any> {
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');

        // Last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const chartData = last7Days.map(date => {
            const dayData = (Array.isArray(store.dailyStats) ? store.dailyStats as any[] : []).find(s => s.date === date);
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
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store) throw new Error('Store not found');

        const user = await this.jsonDatabaseService.findUserById(store.userId);
        if (!user) throw new Error('User not found');

        // Check if there's a linked Shopify shop
        const shopifyStore = (user as any).shopifyStores.find(s => s.id === user.activeShopId) || (user as any).shopifyStores[0];

        if (shopifyStore) {
            return this.shopifyService.getProducts(shopifyStore.shop, shopifyStore.token, { first: 20 });
        }

        // Return unified local products for ALL social stores of this user
        let allProducts = [];
        for (const s of (user as any).socialStores) {
            let products: any[] = Array.isArray(s.products) ? s.products : [];
            if (products.length > 0) {
                for (const p of products) {
                    if (!allProducts.find(existing => existing.id === p.id)) {
                        allProducts.push(p);
                    }
                }
            }
        }

        // Calculate accurate statistics for all user products
        const total = allProducts.length;
        const active = allProducts.filter(p => {
            const stock = p.variants?.reduce((sum, v) => sum + (parseFloat(v.inventory_quantity) || 0), 0) || 0;
            return stock >= 10;
        }).length;
        const outOfStock = allProducts.filter(p => {
            const stock = p.variants?.reduce((sum, v) => sum + (parseFloat(v.inventory_quantity) || 0), 0) || 0;
            return stock === 0;
        }).length;
        const lowStock = allProducts.filter(p => {
            const stock = p.variants?.reduce((sum, v) => sum + (parseFloat(v.inventory_quantity) || 0), 0) || 0;
            return stock > 0 && stock < 10;
        }).length;

        const categorySummary = {};
        allProducts.forEach(p => {
            const cat = p.product_type || 'Uncategorized';
            categorySummary[cat] = (categorySummary[cat] || 0) + 1;
        });

        return {
            products: allProducts,
            totalCount: total,
            summary: {
                total,
                active,
                outOfStock,
                lowStock,
                avgRating: 0,
                categories: categorySummary
            }
        };
    }

    async addProduct(userId: string, id: string, productData: any): Promise<any> {
        const store = await this.jsonDatabaseService.findSocialStoreById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');
        const user = await this.jsonDatabaseService.findUserById(store.userId);

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
        if (user && (user as any).socialStores) {
            for (const s of (user as any).socialStores) {
                let products: any[] = Array.isArray(s.products) ? s.products : [];
                products.push(newProduct);
                await this.jsonDatabaseService.updateSocialStore(s.id, { products });
            }
        }
        return newProduct;
    }

    async editProduct(userId: string, storeId: string, productId: string, data: any): Promise<any> {
        const store = await this.jsonDatabaseService.findSocialStoreById(storeId);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');
        const user = await this.jsonDatabaseService.findUserById(store.userId);

        if (user && (user as any).socialStores) {
            for (const s of (user as any).socialStores) {
                let products: any[] = Array.isArray(s.products) ? s.products : [];
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
                    await this.jsonDatabaseService.updateSocialStore(s.id, { products });
                }
            }
        }
        return { success: true };
    }

    async deleteProduct(userId: string, storeId: string, productId: string): Promise<any> {
        const store = await this.jsonDatabaseService.findSocialStoreById(storeId);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');
        const user = await this.jsonDatabaseService.findUserById(store.userId);

        if (user && (user as any).socialStores) {
            for (const s of (user as any).socialStores) {
                let products: any[] = Array.isArray(s.products) ? s.products : [];
                const newProducts = products.filter(p => p.id !== productId);
                await this.jsonDatabaseService.updateSocialStore(s.id, { products: newProducts });
            }
        }
        return { success: true };
    }
}
