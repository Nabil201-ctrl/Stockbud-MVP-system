import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { OrdersMicroserviceModule } from './orders-microservice/orders-microservice.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(OrdersMicroserviceModule, {
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'order_queue',
            queueOptions: {
                durable: false
            },
        },
    });
    await app.listen();
    console.log('Order Process Microservice is listening via RabbitMQ...');
}
bootstrap();
