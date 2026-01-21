import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
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
    ],
})
export class AppModule { }
