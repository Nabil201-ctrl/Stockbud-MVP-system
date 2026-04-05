import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SocialStore, Product } from '@prisma/client';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class SocialStoresService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly shopifyService: ShopifyService
    ) { }

    async findAll(userId: string): Promise<SocialStore[]> {
        return this.prisma.socialStore.findMany({
            where: { userId },
            include: { products: true }
        });
    }

    async create(userId: string, data: Partial<SocialStore>): Promise<SocialStore> {
        return await this.prisma.socialStore.create({
            data: {
                name: data.name,
                type: data.type || 'whatsapp',
                contact: data.contact,
                description: data.description,
                userId
            }
        });
    }

    async findById(id: string): Promise<SocialStore> {
        return this.prisma.socialStore.findUnique({
            where: { id },
            include: { products: true }
        });
    }

    async update(userId: string, id: string, data: Partial<SocialStore>): Promise<SocialStore> {
        const store = await this.findById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');

        return this.prisma.socialStore.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type,
                contact: data.contact,
                description: data.description
            }
        });
    }

    async delete(userId: string, id: string): Promise<void> {
        const store = await this.findById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');

        // Delete associated products first or let Cascade handle it if defined
        await this.prisma.socialStore.delete({ where: { id } });
    }

    async recordVisit(id: string) {
        return this.prisma.socialStore.update({
            where: { id },
            data: { visits: { increment: 1 } }
        });
    }

    async recordInquiry(id: string) {
        return this.prisma.socialStore.update({
            where: { id },
            data: { inquiries: { increment: 1 } }
        });
    }

    async getStats(userId: string, id: string) {
        const store = await this.findById(id);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');

        // Extract last 7 days range
        const days = 7;
        const last7DaysDates = [...Array(days)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            return d;
        });

        // Fetch actual orders for this store to get real revenue
        const orders = await this.prisma.order.findMany({
            where: {
                storeId: id,
                status: { in: ['delivered', 'paid'] }
            } as any
        });

        const dailyStats = Array.isArray(store.dailyStats) ? store.dailyStats as any[] : [];

        const chartData = last7DaysDates.map(dateObj => {
            const dateStr = dateObj.toISOString().split('T')[0];

            // Get visits/inquiries from JSON
            const stat = dailyStats.find(s => s.date === dateStr);

            // Get revenue from actual orders
            const dayRevenue = orders
                .filter(o => new Date(o.createdAt).toISOString().split('T')[0] === dateStr)
                .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

            return {
                date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
                visits: stat?.visits || 0,
                inquiries: stat?.inquiries || 0,
                revenue: dayRevenue
            };
        });

        // Aggregate totals
        const lifetimeSum = await this.prisma.order.aggregate({
            where: { storeId: id, status: { in: ['delivered', 'paid'] } } as any,
            _sum: { totalAmount: true }
        });
        const lifetimeRevenue = lifetimeSum._sum.totalAmount || 0;

        const totalOrders = await this.prisma.order.count({
            where: { storeId: id, status: { in: ['delivered', 'paid'] } } as any
        });

        // Calculate potential stock value (Potential Revenue)
        const products = await this.prisma.product.findMany({
            where: { socialStoreId: id }
        });
        const potentialStockValue = products.reduce((sum, p) => {
            const vars = Array.isArray(p.variants) ? (p.variants as any[]) : [];
            const price = parseFloat(vars[0] && typeof vars[0] === 'object' ? vars[0].price || '0' : '0');
            return sum + (price * (p.inventory || 0));
        }, 0);

        return {
            totalVisits: store.visits,
            totalInquiries: store.inquiries || 0,
            totalRevenue: lifetimeRevenue,
            totalOrders: totalOrders,
            potentialStockValue: potentialStockValue,
            chartData
        };
    }

    async getOrders(id: string): Promise<any[]> {
        return this.prisma.order.findMany({
            where: { storeId: id } as any,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getProducts(id: string): Promise<any> {
        const store = await this.findById(id);
        if (!store) throw new Error('Store not found');

        const userId = store.userId;
        const user = await this.prisma.findUserById(userId);

        const localProducts = await this.prisma.product.findMany({
            where: {
                userId,
                source: { in: ['instagram', 'whatsapp', 'manual'] }
            }
        });

        // Check if there's a linked Shopify shop for fallback/stats
        const shopifyStore = (user as any).shopifyStores?.find(s => s.id === id) || (user as any).shopifyStores?.[0];

        if (localProducts.length === 0 && shopifyStore) {
            return this.shopifyService.getProducts(shopifyStore.shop, shopifyStore.token, { first: 20 });
        }

        // Fetch all orders for this store to calculate per-product revenue
        const orders = await this.prisma.order.findMany({
            where: { storeId: id, status: { in: ['delivered', 'paid'] } } as any
        });

        // Map product revenue
        const productRevenueMap = {};
        let totalRevenue = 0;

        orders.forEach(order => {
            const items = (order.items as any[]) || [];
            items.forEach(item => {
                const pId = item.productId;
                if (pId) {
                    const lineRevenue = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                    productRevenueMap[pId] = (productRevenueMap[pId] || 0) + lineRevenue;
                    totalRevenue += lineRevenue;
                }
            });
        });

        // Convert local Product models to the format expected by the frontend (Shopify-like)
        const products = localProducts.map(p => ({
            id: p.id,
            title: p.title,
            name: p.title,
            category: p.productType,
            product_type: p.productType,
            image: (p.images as any[])?.[0]?.src || '',
            images: p.images,
            price: p.price,
            stock: p.inventory,
            revenue: productRevenueMap[p.id] || 0,
            variants: [{
                price: p.price.toString(),
                inventory_quantity: p.inventory
            }],
            status: p.status,
            createdAt: p.createdAt
        }));

        // Calculate statistics
        const total = products.length;
        const active = products.filter(p => p.stock >= 10).length;
        const outOfStock = products.filter(p => p.stock === 0).length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;

        // Group by category
        const categories = {};
        products.forEach(p => {
            const cat = p.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        return {
            products,
            pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null
            },
            totalCount: products.length,
            summary: {
                total,
                active,
                outOfStock,
                lowStock,
                totalRevenue,
                avgRating: 0,
                categories
            }
        };
    }

    async addProduct(userId: string, storeId: string, data: any): Promise<Product> {
        const store = await this.findById(storeId);
        if (!store || store.userId !== userId) throw new Error('Unauthorized or store not found');

        return this.prisma.product.create({
            data: {
                userId,
                socialStoreId: storeId,
                title: data.title || data.name,
                productType: data.category || 'Uncategorized',
                price: parseFloat(data.price) || 0,
                inventory: parseInt(data.stock) || 0,
                images: data.image ? [{ src: data.image }] : [],
                variants: [{
                    price: (data.price || 0).toString(),
                    inventory_quantity: parseInt(data.stock) || 0
                }],
                source: store.type || 'manual',
                status: 'active'
            }
        });
    }

    async editProduct(userId: string, storeId: string, productId: string, data: any): Promise<Product> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product || product.userId !== userId) throw new Error('Unauthorized or product not found');

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                title: data.title || data.name || product.title,
                productType: data.category || product.productType,
                price: data.price ? parseFloat(data.price) : product.price,
                inventory: data.stock ? parseInt(data.stock) : product.inventory,
                images: data.image ? [{ src: data.image }] : (product.images as any[]),
                variants: [{
                    price: (data.price || product.price).toString(),
                    inventory_quantity: parseInt(data.stock || product.inventory)
                }],
                status: data.status || product.status
            }
        });
    }

    async deleteProduct(userId: string, storeId: string, productId: string): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product || product.userId !== userId) throw new Error('Unauthorized or product not found');

        await this.prisma.product.delete({ where: { id: productId } });
    }
}
