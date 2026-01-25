import { Controller, Get, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
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

        // Pass credentials if available, otherwise service handles graceful fallback (empty arrays)
        const shop = user?.shopifyShop;
        const token = await this.usersService.getDecryptedShopifyToken(user.id);

        return this.dashboardService.getStats(shop, token);
    }
}
