import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Add this import
import { ShopifyService } from './shopify.service';
import { UsersService } from '../users/users.service'; // Add this import
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ConnectShopDto } from './dto/connect-shop.dto';

@Controller('shopify')
export class ShopifyController {
    constructor(private readonly shopifyService: ShopifyService) { }

    @Post('connect')
    @UseGuards(ApiKeyGuard)
    async connectShop(@Body() dto: ConnectShopDto) {
        return await this.shopifyService.connectShop(dto);
    }

    @Get('products')
    @UseGuards(AuthGuard('jwt'))
    async getProducts(@Req() req) {
        const user = req.user;

        if (!user || !user.shopifyShop || !user.shopifyToken) {
            throw new HttpException('Shopify credentials not found. Please connect your store in Settings.', HttpStatus.UNAUTHORIZED); // Or BAD_REQUEST
        }

        return await this.shopifyService.getProducts(user.shopifyShop, user.shopifyToken);
    }
}
