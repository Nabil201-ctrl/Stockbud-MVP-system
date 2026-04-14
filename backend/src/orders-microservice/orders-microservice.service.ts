import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersMicroserviceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly shopifyService: ShopifyService,
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService
    ) { }

    async processCreateOrder(orderMessage: any) {
        const { order, userId } = orderMessage;
        console.log(`[OrderMicroservice] Processing order for user ${userId}...`);

        try {
            // Ensure storeId is not null as it's required in the schema
            const storeId = order.storeId || 'manual';

            const savedOrder = await this.prisma.order.create({
                data: {
                    userId: userId || null,
                    storeId,
                    customerName: order.customerName || 'Walk-in Customer',
                    customerPhone: order.customerPhone || null,
                    customerEmail: order.customerEmail || null,
                    customerAddress: order.customerAddress || null,
                    totalAmount: order.totalAmount || 0,
                    currency: order.currency || 'USD',
                    source: order.source || 'social',
                    status: order.status || 'delivered',
                    items: order.items || [],
                    createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
                } as any
            });
            console.log(`[OrderMicroservice] Order ${(savedOrder as any).id} saved! Now managing inventory...`);

            // Notify user about new order
            if (userId) {
                await this.notificationsService.create(
                    userId,
                    'Business Insight',
                    `A new order totaling $${order.totalAmount || 0} has been processed from ${order.customerName || 'customer'}.`,
                    'info'
                );
            }

            // Inventory Deduction Logic
            const items = order.items || [];
            for (const item of items) {
                const productId = item.productId;
                if (!productId) continue;

                // 1. Find product in local DB (Check both local id and shopify external gid)
                const product = await this.prisma.product.findFirst({
                    where: {
                        OR: [
                            { id: productId },
                            { externalId: productId }
                        ]
                    }
                });

                if (product) {
                    const quantity = item.quantity || 1;
                    const newInventory = Math.max(0, (product.inventory || 0) - quantity);

                    // Update variants JSON
                    let variants = Array.isArray(product.variants) ? [...(product.variants as any[])] : [];
                    if (variants.length > 0) {
                        variants[0].inventory_quantity = Math.max(0, (parseFloat(variants[0].inventory_quantity) || 0) - quantity);
                    }

                    // 2. Update local Product record
                    await this.prisma.product.update({
                        where: { id: productId },
                        data: {
                            inventory: newInventory,
                            variants: variants as any
                        }
                    });
                    console.log(`[OrderMicroservice] Deducted ${quantity} from local product ${product.title}. Remaining: ${newInventory}`);

                    // Notification for low inventory
                    if (newInventory < 10 && (product.inventory || 0) >= 10 && userId) {
                        await this.notificationsService.create(
                            userId,
                            'Inventory Management',
                            `Inventory for "${product.title}" has fallen below the safety threshold. Current balance: ${newInventory} units.`,
                            'warning',
                            ['in-app', 'email']
                        );
                    }

                    // 3. If it's a Shopify product, sync back to Shopify
                    if (product.shopifyStoreId && product.externalId) {
                        const token = await this.usersService.getDecryptedShopifyToken(userId);
                        const store = await this.prisma.shopifyStore.findUnique({ where: { id: product.shopifyStoreId } });

                        if (store && token) {
                            // Extract variant ID from variants JSON if possible, otherwise use externalId (which is product ID)
                            // Note: Shopify inventory adjustment requires variant ID or inventory item ID.
                            // Assuming variants[0] has the variant ID if available
                            const variantId = (variants[0] as any)?.id || product.externalId; // This might need refinement based on structure

                            // For simplicity, we attempt to adjust the quantity on Shopify
                            await this.shopifyService.updateInventory(
                                store.shop,
                                token,
                                variantId,
                                -quantity
                            );
                        }
                    }
                }
            }

            return { success: true, orderId: (savedOrder as any).id };
        } catch (error) {
            console.error('[OrderMicroservice] Error processing order:', error.message);
            return { success: false, error: error.message };
        }
    }
}
