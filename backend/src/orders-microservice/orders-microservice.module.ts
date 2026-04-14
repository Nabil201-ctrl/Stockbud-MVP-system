import { Module, forwardRef } from '@nestjs/common';
import { OrdersMicroserviceController } from './orders-microservice.controller';
import { OrdersMicroserviceService } from './orders-microservice.service';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        forwardRef(() => AppModule),
        NotificationsModule,
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
