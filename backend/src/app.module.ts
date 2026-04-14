import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { ShopifyModule } from './shopify/shopify.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CommonModule } from './common/common.module';
import { FeedModule } from './feed/feed.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { DatabaseModule } from './database/database.module';
import { OrdersModule } from './orders/orders.module';
import { ImageMicroserviceModule } from './image-microservice/image-microservice.module';
import { AdminModule } from './admin/admin.module';
import { SocialStoresModule } from './social-stores/social-stores.module';
import { AppLogger } from './common/logger';

import { HealthModule } from './health/health.module';


@Module({
    imports: [
        HealthModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        SentryModule.forRoot(),

        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        EmailModule,
        DashboardModule,
        ProductsModule,
        UsersModule,
        ShopifyModule,
        AuthModule,
        ChatModule,
        CommonModule,
        FeedModule,
        ReportsModule,
        NotificationsModule,
        PaymentsModule,
        OrdersModule,
        ImageMicroserviceModule,
        AdminModule,
        SocialStoresModule,
    ],
    providers: [
        AppLogger,
        {
            provide: APP_FILTER,
            useClass: SentryGlobalFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
