import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersProducerService } from './orders.producer.service';
import { UsersService } from '../users/users.service';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersProducer: OrdersProducerService,
        private readonly usersService: UsersService
    ) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async createManualOrder(@Req() req, @Body() body: any) {
        const userId = req.user.id;
        const user: any = await this.usersService.findById(userId);
        const storeId = user?.activeShopId || 'manual';
        const socialStore = user?.socialStores?.find((s: any) => s.id === storeId);
        const orderSource = socialStore ? socialStore.type : 'POS/Manual';

        const orderMessage = {
            action: 'CREATE_ORDER',
            userId,
            order: {
                storeId,
                totalAmount: body.totalAmount,
                currency: body.currency || 'USD',
                customerName: body.customerName || 'Manual Customer',
                items: body.items || [
                    {
                        productId: body.productId,
                        productName: body.productName || 'Manual Product',
                        price: body.price || 0,
                        quantity: body.quantity || 1
                    }
                ],
                status: 'delivered',
                createdAt: new Date().toISOString(),
                source: orderSource
            }
        };

        return this.ordersProducer.sendOrderMessage(orderMessage as any);
    }
}
