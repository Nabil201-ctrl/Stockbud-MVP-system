import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class ProductsService {
    constructor(
        private prisma: PrismaService,
        private shopifyService: ShopifyService
    ) { }

    async findAll(userId: string) {
        // 1. Fetch Local Products (Social Stores & Scraped Sites)
        const localProducts = await this.prisma.product.findMany({
            where: { userId },
            include: {
                socialStore: true
            }
        });

        // 2. Fetch Shopify Products (if any shop is connected)
        const shopifyStores = await this.prisma.shopifyStore.findMany({
            where: { userId }
        });

        let allProducts = localProducts.map(p => ({
            id: p.id,
            name: p.title,
            category: p.productType || 'Uncategorized',
            price: p.price,
            stock: p.inventory,
            status: p.status === 'active' ? (p.inventory > 10 ? 'active' : p.inventory > 0 ? 'low' : 'out') : 'inactive',
            revenue: 0, // Calculated later if needed
            rating: 4.0, // Default rating
            image: (p.images as any[])?.[0]?.src || '',
            source: p.source,
            storeName: p.socialStore?.name || 'Local'
        }));

        for (const store of shopifyStores) {
            try {
                const shopifyProducts = await this.shopifyService.getProducts(store.shop, store.token, { first: 50 });
                const mappedShopify = (shopifyProducts.products || []).map(p => ({
                    id: p.id,
                    name: p.title,
                    category: p.productType || 'Electronics',
                    price: parseFloat(p.variants?.[0]?.price || '0'),
                    stock: p.variants?.[0]?.inventory_quantity || 0,
                    status: (p.variants?.[0]?.inventory_quantity || 0) > 10 ? 'active' : (p.variants?.[0]?.inventory_quantity || 0) > 0 ? 'low' : 'out',
                    revenue: 0,
                    rating: 4.5,
                    image: p.image?.src || '',
                    source: 'shopify',
                    storeName: store.name || store.shop
                }));
                allProducts = [...allProducts, ...mappedShopify];
            } catch (err) {
                console.error(`Failed to fetch Shopify products for ${store.shop}:`, err.message);
            }
        }

        // 3. Calculate Stats
        const stats = {
            total: allProducts.length,
            active: allProducts.filter(p => p.stock > 0).length,
            outOfStock: allProducts.filter(p => p.stock === 0).length,
            lowStock: allProducts.filter(p => p.stock > 0 && p.stock <= 10).length,
            totalRevenue: allProducts.reduce((sum, p) => sum + p.revenue, 0),
            avgRating: allProducts.length > 0 ? allProducts.reduce((sum, p) => sum + p.rating, 0) / allProducts.length : 0
        };

        return {
            data: allProducts,
            stats
        };
    }
}
