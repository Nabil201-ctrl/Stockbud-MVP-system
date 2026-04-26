import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'SCRAPER_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'],
                    queue: 'scraper_queue',
                    queueOptions: {
                        durable: false,
                    },
                },
            },
        ]),
    ],
    controllers: [ScraperController],
    providers: [ScraperService, EncryptionService],
    exports: [ScraperService],
})
export class ScraperModule {}
