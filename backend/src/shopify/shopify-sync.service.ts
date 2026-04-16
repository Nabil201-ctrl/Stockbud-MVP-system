import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Injectable()
export class ShopifySyncService {
    private readonly logger = new Logger(ShopifySyncService.name);

    constructor(
        @Inject(forwardRef(() => ShopifyService))
        private readonly shopifyService: ShopifyService,
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        @InjectMetric('shopify_sync_total')
        private readonly syncCounter: Counter<string>,
    ) { }

    /**
     * Performs an initial deep sync for a newly connected shop.
     * Caches products and the last 100 orders.
     */
    async initialSync(userId: string, shopId: string) {
        const store = await this.prisma.shopifyStore.findUnique({ where: { id: shopId } });
        if (!store) return;

        this.logger.log(`Starting initial sync for shop: ${store.shop}`);

        const syncRecord = await this.prisma.createSyncHistory({
            userId,
            shopId,
            entityType: 'all',
            status: 'in_progress',
        });

        try {
            const token = await this.usersService.getDecryptedShopifyToken(userId);

            // 1. Sync Products
            const productsCount = await this.syncProducts(userId, store.id, store.shop, token);

            // 2. Sync Last 100 Orders
            const ordersCount = await this.syncOrders(userId, store.id, store.shop, token, 100);

            await this.prisma.updateSyncHistory(syncRecord.id, {
                status: 'success',
                endTime: new Date(),
                results: { products: productsCount, orders: ordersCount },
            });

            this.syncCounter.inc({ shop: store.shop, status: 'success' });
            this.logger.log(`Initial sync completed for ${store.shop}: ${productsCount} products, ${ordersCount} orders.`);
        } catch (error) {
            this.syncCounter.inc({ shop: store.shop, status: 'failed' });
            this.logger.error(`Initial sync failed for ${store.shop}: ${error.message}`);
            await this.prisma.updateSyncHistory(syncRecord.id, {
                status: 'failed',
                endTime: new Date(),
                results: { error: error.message },
            });
        }
    }

    async syncProducts(userId: string, storeId: string, shop: string, token: string): Promise<number> {
        let hasNextPage = true;
        let cursor = null;
        let totalSynced = 0;

        while (hasNextPage) {
            const result = await this.shopifyService.getProducts(shop, token, { first: 50, after: cursor });
            const products = result.products || [];

            for (const p of products) {
                await this.prisma.upsertProduct({
                    externalId: p.id,
                    title: p.title,
                    productType: p.product_type,
                    status: p.status,
                    images: p.images,
                    variants: p.variants,
                    price: parseFloat(p.variants[0]?.price || '0'),
                    inventory: p.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0),
                    source: 'shopify',
                    shopifyStoreId: storeId,
                    userId: userId,
                });
                totalSynced++;
            }

            hasNextPage = result.pageInfo?.hasNextPage;
            cursor = result.pageInfo?.endCursor;

            // Safety break to avoid infinite loops in dev
            if (totalSynced > 1000) break;
        }

        return totalSynced;
    }

    async syncOrders(userId: string, storeId: string, shop: string, token: string, limit = 50): Promise<number> {
        const result: any = await this.shopifyService.getOrders(shop, token, { first: limit });
        const orders = result.orders || [];
        let totalSynced = 0;

        for (const o of orders) {
            await this.prisma.upsertShopifyOrder({
                shopifyOrderId: o.id,
                orderNumber: o.name,
                storeId: storeId,
                items: o.line_items,
                totalAmount: parseFloat(o.total_price),
                currency: o.currency || 'USD',
                customerName: o.customer ? `${o.customer.first_name} ${o.customer.last_name || ''}` : 'Shopify Customer',
                customerEmail: o.customer?.email,
                financialStatus: o.financial_status,
                fulfillmentStatus: o.fulfillment_status || 'unfulfilled',
                source: 'shopify',
                createdAt: new Date(o.created_at),
                userId: userId,
            });
            totalSynced++;
        }

        return totalSynced;
    }

    /**
     * Periodic sync for all active Shopify stores.
     * Runs every 4 hours.
     */
    @Cron(CronExpression.EVERY_4_HOURS)
    async scheduledSync() {
        this.logger.log('Running scheduled sync for all Shopify stores...');
        const users = await this.prisma.getAllUsers();

        for (const user of users) {
            for (const store of user.shopifyStores) {
                try {
                    const token = await this.usersService.getDecryptedShopifyToken(user.id);
                    await this.syncProducts(user.id, store.id, store.shop, token);
                    await this.syncOrders(user.id, store.id, store.shop, token, 20); // Just recent 20
                    this.syncCounter.inc({ shop: store.shop, status: 'success' });
                } catch (err) {
                    this.syncCounter.inc({ shop: store.shop, status: 'failed' });
                    this.logger.error(`Scheduled sync failed for store ${store.shop}: ${err.message}`);
                }
            }
        }
    }
}
