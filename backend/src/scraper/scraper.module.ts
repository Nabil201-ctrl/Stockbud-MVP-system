import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { PrismaModule } from '../database/prisma.module';
import { EncryptionModule } from '../common/encryption.module';

@Module({
    imports: [
        PrismaModule,
        EncryptionModule,
        ClientsModule.registerAsync([
            {
                name: 'SCRAPER_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
                        queue: 'scraper_queue',
                        queueOptions: {
                            durable: false,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    providers: [ScraperService],
    controllers: [ScraperController],
    exports: [ScraperService],
})
export class ScraperModule {}
