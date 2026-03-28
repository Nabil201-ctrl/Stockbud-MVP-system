import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';
import { OrdersProducerService } from './orders.producer.service';
import { SocialStoresModule } from '../social-stores/social-stores.module';

@Module({
    imports: [
        forwardRef(() => SocialStoresModule),
        ClientsModule.register([{
            name: 'ORDERS_SERVICE',
            transport: Transport.RMQ,
            options: {
                urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                queue: 'order_queue',
                queueOptions: {
                    durable: false
                },
            },
        }]),
    ],
    controllers: [OrdersController],
    providers: [OrdersProducerService],
    exports: [OrdersProducerService],
})
export class OrdersModule { }
