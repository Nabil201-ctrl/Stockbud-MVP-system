import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { SocialStoresModule } from '../social-stores/social-stores.module';


@Module({
    imports: [DashboardModule, UsersModule, NotificationsModule, SocialStoresModule, forwardRef(() => ShopifyModule)],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }
