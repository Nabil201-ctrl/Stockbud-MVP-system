import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ImageMicroserviceController } from './image-microservice.controller';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'IMAGE_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                    queue: 'image_processing_requests',
                    queueOptions: {
                        durable: false
                    },
                },
            },
        ]),
    ],
    controllers: [ImageMicroserviceController],
    exports: [ClientsModule],
})
export class ImageMicroserviceModule { }
