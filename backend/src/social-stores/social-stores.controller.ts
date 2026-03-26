import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialStoresService, SocialStore, SocialProduct } from './social-stores.service';
import { UsersService } from '../users/users.service';

@Controller('social-stores')
export class SocialStoresController {
    constructor(
        private readonly socialStoresService: SocialStoresService,
        @Inject(forwardRef(() => UsersService))
        private readonly usersService: UsersService,
    ) { }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async createStore(@Req() req, @Body() body: { type: string; storeName: string; contact: string; description?: string; logo?: string }) {
        const store = await this.socialStoresService.createStore(req.user.id, body);
        // Automatically set it as active
        await this.usersService.setActiveShop(req.user.id, store.id);
        return store;
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getStores(@Req() req) {
        return this.socialStoresService.getStores(req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':storeId')
    async getStoreById(@Req() req, @Param('storeId') storeId: string) {
        return this.socialStoresService.getStoreById(storeId, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':storeId')
    async deleteStore(@Req() req, @Param('storeId') storeId: string) {
        return this.socialStoresService.deleteStore(storeId, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':storeId/products')
    async createProduct(
        @Req() req,
        @Param('storeId') storeId: string,
        @Body() body: { name: string; description?: string; price: number; currency?: string; image?: string; stock?: number },
    ) {
        return this.socialStoresService.createProduct(req.user.id, storeId, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':storeId/products')
    async getProducts(@Req() req, @Param('storeId') storeId: string) {
        return this.socialStoresService.getProducts(storeId, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('products/:productId')
    async updateProduct(@Req() req, @Param('productId') productId: string, @Body() body: any) {
        return this.socialStoresService.updateProduct(productId, req.user.id, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('products/:productId')
    async deleteProduct(@Req() req, @Param('productId') productId: string) {
        return this.socialStoresService.deleteProduct(productId, req.user.id);
    }

    @Get('public/product/:slug')
    async getPublicProduct(@Param('slug') slug: string) {
        return this.socialStoresService.getPublicProduct(slug);
    }

    @Get('public/store/:storeId')
    async getPublicStore(@Param('storeId') storeId: string) {
        return this.socialStoresService.getPublicStore(storeId);
    }
}
