import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UsersModule } from '../users/users.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
    imports: [UsersModule, DashboardModule],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule { }
