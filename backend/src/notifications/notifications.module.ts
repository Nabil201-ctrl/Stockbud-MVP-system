import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';


@Module({
    imports: [ConfigModule, UsersModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsGateway],
    exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule { }
