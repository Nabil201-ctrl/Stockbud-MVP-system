import { Controller, Get, Post, Patch, Param, UseGuards, Req, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly usersService: UsersService
    ) { }

    @Post('push-subscribe')
    async subscribeToPush(@Req() req, @Body() body: { subscription: any }) {
        return this.usersService.updateProfile(req.user.id, { pushSubscription: body.subscription });
    }

    @Post('test-email')
    async testEmail(@Req() req, @Body() body: { email?: string }) {
        const email = body.email || req.user.email;
        return this.notificationsService.sendEmail(
            email,
            'Test Notification',
            '<h1>This is a test notification from StockBud!</h1>'
        );
    }

    @Post('test-push')
    async testPush(@Req() req) {
        const user = await this.usersService.findById(req.user.id);
        if (!user || !user.pushSubscription) {
            return { success: false, message: 'No push subscription found' };
        }
        return this.notificationsService.sendPush(
            user.pushSubscription,
            { title: 'Test Push', body: 'This is a test push notification!' }
        );
    }

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
