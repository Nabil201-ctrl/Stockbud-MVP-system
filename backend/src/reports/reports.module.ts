import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';


@Module({
    imports: [DashboardModule, UsersModule, NotificationsModule],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }
