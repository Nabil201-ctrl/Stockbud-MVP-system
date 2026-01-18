import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req } from '@nestjs/common';
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
    @Post('shopify-stores/active')
    @UseGuards(AuthGuard('jwt'))
    async setActiveShop(@Req() req, @Body() body: { storeId: string }) {
        return this.usersService.setActiveShop(req.user.id, body.storeId);
    }
}
