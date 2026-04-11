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

        // Gather ALL Shopify stores for unified dashboard
        const allShopifyStores: { shop: string; token: string; targetType: string; targetValue: number }[] = [];
        for (const store of ((fullUser as any)?.shopifyStores || [])) {
            try {
                const decryptedToken = this.usersService['encryptionService'].decrypt(store.token);
                allShopifyStores.push({
                    shop: store.shop,
                    token: decryptedToken,
                    targetType: store.targetType || 'monthly',
                    targetValue: store.targetValue || 0,
                });
            } catch (e) {
                console.error(`[Dashboard] Failed to decrypt token for store ${store.shop}:`, e.message);
            }
        }

        // Use first store's target as default (or fallback)
        const targetType = allShopifyStores[0]?.targetType || 'monthly';
        const targetValue = allShopifyStores[0]?.targetValue || 0;

        let sourceFilter: string | undefined = filter !== 'all' ? filter : undefined;

        return this.dashboardService.getStats(
            user.id,
            allShopifyStores,
            targetType as 'weekly' | 'monthly',
            targetValue,
            userCurrency,
            range,
            sourceFilter,
            sortBy,
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


