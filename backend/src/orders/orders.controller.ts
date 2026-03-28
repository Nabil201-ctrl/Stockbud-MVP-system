import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { SocialStoresService } from '../social-stores/social-stores.service';
import { OrdersProducerService } from './orders.producer.service';
import { OrderMicroserviceMessage } from './orders.interface';
import { randomUUID } from 'crypto';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly socialStoresService: SocialStoresService,
        private readonly ordersProducerService: OrdersProducerService,
    ) { }

    @Post('public/:slug/place')
    async placeOrder(
        @Param('slug') slug: string,
        @Body() body: {
            customerName: string;
            customerPhone: string;
            customerAddress: string;
            quantity: number;
        },
    ) {
        // Find product by slug
        const productData = await this.socialStoresService.getPublicProduct(slug);
        if (!productData) throw new NotFoundException('Product not found');

        const orderId = randomUUID();
        const orderData = {
            id: orderId,
            storeId: productData.storeId,
            items: [{
                productId: productData.id,
                productName: productData.name,
                price: productData.price,
                quantity: body.quantity || 1,
            }],
            totalAmount: productData.price * (body.quantity || 1),
            currency: productData.currency,
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            customerAddress: body.customerAddress,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
        };

        const message: OrderMicroserviceMessage = {
            order: orderData,
            action: 'CREATE_ORDER',
        };

        // Emit message to RabbitMQ
        await this.ordersProducerService.sendOrderMessage(message);

        return {
            success: true,
            message: 'Order received and is being processed.',
            orderId: orderId,
        };
    }
}
