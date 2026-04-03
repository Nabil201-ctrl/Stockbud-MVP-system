import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { UsersService } from '../users/users.service';

@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly usersService: UsersService,
    ) { }

    @Get('stats')
    @UseGuards(AuthGuard('jwt'))
    async getStats(@Req() req) {
        const user = req.user;
        const range = req.query.range as '7days' | 'month' | 'year' || 'month';
        const filter = req.query.filter as string || 'all';
        const sortBy = req.query.sortBy as string || 'newest';

        const fullUser = await this.usersService.findById(user.id);
        const userCurrency = fullUser?.currency || 'USD';

        const shopStore = await this.usersService.getActiveShop(user.id);
        const shop = shopStore?.shop || fullUser?.shopifyShop;
        const targetType = shopStore?.targetType || 'monthly';
        const targetValue = shopStore?.targetValue || 0;
        const token = await this.usersService.getDecryptedShopifyToken(user.id);

        let sourceFilter: string | undefined = filter !== 'all' ? filter : undefined;

        // If it's a social store and no filter specified, default to that social store's type
        const socialStore = (fullUser as any)?.socialStores?.find((s: any) => s.id === fullUser.activeShopId);
        if (socialStore && !sourceFilter) {
            sourceFilter = socialStore.type;
        }

        return this.dashboardService.getStats(
            user.id,
            shop,
            token,
            targetType as 'weekly' | 'monthly',
            targetValue,
            userCurrency,
            range,
            sourceFilter,
            sortBy
        );
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
