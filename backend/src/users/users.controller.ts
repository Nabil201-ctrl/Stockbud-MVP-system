import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll() {
        return this.usersService.getAllUsers();
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req) {
        return req.user;
    }

    @Put('me')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req, @Body() body: any) {
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

    /**
     * Get all connected Shopify stores for the user.
     */
    @Get('shopify-stores')
    @UseGuards(AuthGuard('jwt'))
    async getShopifyStores(@Req() req) {
        const user = await this.usersService.findById(req.user.id);
        return {
            stores: user?.shopifyStores || [],
            activeShopId: user?.activeShopId,
        };
    }

    /**
     * Remove a specific Shopify store by ID.
     */
    @Delete('shopify-stores/:storeId')
    @UseGuards(AuthGuard('jwt'))
    async removeShopifyStore(@Req() req) {
        const storeId = req.params.storeId;
        return this.usersService.removeShopifyStore(req.user.id, storeId);
    }

    /**
     * Set the active Shopify store.
     */
    async setActiveShop(@Req() req, @Body() body: { storeId: string }) {
        return this.usersService.setActiveShop(req.user.id, body.storeId);
    }

    /**
     * Update bot settings for a specific shop.
     */
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
    @UseGuards(AuthGuard('jwt'))
    async setAllFreeReports(@Body() body: { enable: boolean }) {
        const count = await this.usersService.setAllFreeReports(body.enable);
        return { success: true, count };
    }

    @Patch(':id/free-reports')
    @UseGuards(AuthGuard('jwt'))
    async setFreeReports(@Param('id') id: string, @Body() body: { enable: boolean }) {
        return this.usersService.setFreeReports(id, body.enable);
    }
}
