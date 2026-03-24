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
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        PrismaModule,
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
    ],
})
export class AppModule { }
