import { Controller, Get, Post, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getNotifications(@Req() req) {
        return this.notificationsService.findByUser(req.user.id);
    }

    @Patch(':id/read')
    async markAsRead(@Req() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }

    @Patch('read-all')
    async markAllAsRead(@Req() req) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
}
