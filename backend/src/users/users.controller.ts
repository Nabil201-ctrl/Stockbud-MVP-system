import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { PlanService } from '../common/plan.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly planService: PlanService
    ) { }

    @Get()
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    findAll() {
        return this.usersService.getAllUsers();
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req) {
        return this.usersService.findById(req.user.id);
    }


    @Put('me')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req, @Body() body: UpdateUserDto) {
        return this.usersService.updateProfile(req.user.id, body);
    }

    @Post('shopify-credentials')
    @UseGuards(AuthGuard('jwt'))
    async updateShopifyCredentials(@Req() req, @Body() body: { shop: string; token: string }) {
        return this.usersService.updateShopifyCredentials(req.user.id, body.shop, body.token);
    }

    @Delete('shopify-credentials')
    @UseGuards(AuthGuard('jwt'))
    async removeShopifyCredentials(@Req() req) {
        return this.usersService.removeShopifyCredentials(req.user.id);
    }

    @Post('onboarding/complete')
    @UseGuards(AuthGuard('jwt'))
    async completeOnboarding(@Req() req) {
        return this.usersService.completeOnboarding(req.user.id);
    }

    @Get('shopify-stores')
    @UseGuards(AuthGuard('jwt'))
    async getShopifyStores(@Req() req) {
        const user = await this.usersService.findById(req.user.id);
        return {
            stores: (user as any)?.shopifyStores || [],
            activeShopId: user?.activeShopId,
        };
    }

    @Delete('shopify-stores/:storeId')
    @UseGuards(AuthGuard('jwt'))
    async removeShopifyStore(@Req() req) {
        const storeId = req.params.storeId;
        return this.usersService.removeShopifyStore(req.user.id, storeId);
    }

    @Post('shopify-stores/active')
    @UseGuards(AuthGuard('jwt'))
    async setActiveShop(@Req() req, @Body() body: { storeId: string }) {
        return this.usersService.setActiveShop(req.user.id, body.storeId);
    }

    @Put('shopify-stores/:storeId/settings')
    @UseGuards(AuthGuard('jwt'))
    async updateShopSettings(@Req() req, @Body() body: any) {
        const storeId = req.params.storeId;
        return this.usersService.updateShopSettings(req.user.id, storeId, body);
    }
    @Post('top-up')
    @UseGuards(AuthGuard('jwt'))
    async topUpTokens(@Req() req, @Body() body: { amount: number }) {
        return this.usersService.topUpTokens(req.user.id, body.amount);
    }


    @Patch('free-reports-all')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    async setAllFreeReports(@Body() body: { enable: boolean }) {
        const count = await this.usersService.setAllFreeReports(body.enable);
        return { success: true, count };
    }

    @Get('me/plan')
    @UseGuards(AuthGuard('jwt'))
    async getPlanSummary(@Req() req) {
        return this.planService.getUsageSummary(req.user);
    }

    @Post('me/plan/upgrade')
    @UseGuards(AuthGuard('jwt'))
    async upgradePlan(@Req() req, @Body() body: { plan: 'free' | 'beginner' | 'pro' }) {
        return this.planService.upgradePlan(req.user.id, body.plan);
    }

    @Patch(':id/free-reports')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    async setFreeReports(@Param('id') id: string, @Body() body: { enable: boolean }) {
        return this.usersService.setFreeReports(id, body.enable);
    }
}
