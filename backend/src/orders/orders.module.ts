import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersProducerService } from './orders.producer.service';
import { OrdersController } from './orders.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
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
