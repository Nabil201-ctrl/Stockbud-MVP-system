import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { OrdersMicroserviceController } from './orders-microservice.controller';
import { OrdersMicroserviceService } from './orders-microservice.service';
import { HealthModule } from '../health/health.module';

@Module({
    imports: [
        HealthModule,
        HealthModule,
        SentryModule.forRoot(),
    ],
    controllers: [OrdersMicroserviceController],
    providers: [
        OrdersMicroserviceService,
        {
            provide: APP_FILTER,
            useClass: SentryGlobalFilter,
        },
    ],
})
export class OrdersMicroserviceModule { }
