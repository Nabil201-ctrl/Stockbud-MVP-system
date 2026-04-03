import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { OrdersMicroserviceModule } from './orders-microservice/orders-microservice.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
    const app = await NestFactory.create(OrdersMicroserviceModule);

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'order_queue',
            queueOptions: {
                durable: false
            },
        },
    });

    const port = process.env.ORDERS_SERVICE_PORT || 3003;
    await app.startAllMicroservices();
    await app.listen(port);

    console.log(`Order Process Microservice is listening via RabbitMQ and HTTP (metrics) on port ${port}...`);
}
bootstrap();
