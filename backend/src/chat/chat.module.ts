import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UsersModule } from '../users/users.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ReportsModule } from '../reports/reports.module';
import { SocialStoresModule } from '../social-stores/social-stores.module';

@Module({
    imports: [UsersModule, DashboardModule, ReportsModule, SocialStoresModule],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule { }
