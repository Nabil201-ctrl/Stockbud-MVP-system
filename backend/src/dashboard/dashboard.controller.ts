import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

import { UsersService } from '../users/users.service';

@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly usersService: UsersService
    ) { }

    @Get('stats')
    @UseGuards(AuthGuard('jwt'))
    async getStats(@Req() req) {
        const user = req.user;

        const fullUser = await this.usersService.findById(user.id);
        const userCurrency = fullUser?.currency || 'USD';

        // Fetch active shop properly
        const shopStore = await this.usersService.getActiveShop(user.id);
        const shop = shopStore?.shop;
        const targetType = shopStore?.targetType || 'monthly';
        const targetValue = shopStore?.targetValue || 0;
        const token = shopStore?.token ? await this.usersService.getDecryptedShopifyToken(user.id) : undefined;

        return this.dashboardService.getStats(shop, token, targetType, targetValue, userCurrency);
    }

    @Post('target')
    @UseGuards(AuthGuard('jwt'))
    async setTarget(@Req() req, @Body() body: { type: 'weekly' | 'monthly'; value: number }) {
        const user = req.user;
        const shopStore = await this.usersService.getActiveShop(user.id);
        if (!shopStore) throw new HttpException('No active shop', HttpStatus.BAD_REQUEST);

        await this.usersService.setStoreTarget(user.id, shopStore.id, body.type, body.value);
        return { message: 'Target updated successfully' };
    }
}
