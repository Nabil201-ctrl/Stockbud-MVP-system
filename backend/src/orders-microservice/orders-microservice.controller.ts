import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersMicroserviceService } from './orders-microservice.service';
import { OrderMicroserviceMessage } from '../orders/orders.interface';

@Controller()
export class OrdersMicroserviceController {
    constructor(private readonly ordersService: OrdersMicroserviceService) { }

    @EventPattern('order_action')
    async handleOrderAction(@Payload() data: OrderMicroserviceMessage) {
        console.log('[OrderMicroservice] Order action received:', data.action);
        if (data.action === 'CREATE_ORDER') {
            await this.ordersService.processCreateOrder(data.order as any);
        }
    }
}
