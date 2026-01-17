import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Add this import
import { ShopifyService } from './shopify.service';
import { UsersService } from '../users/users.service'; // Add this import
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ConnectShopDto } from './dto/connect-shop.dto';

@Controller('shopify')
export class ShopifyController {
    constructor(
        private readonly shopifyService: ShopifyService,
        private readonly usersService: UsersService
    ) { }

    @Post('connect')
    @UseGuards(AuthGuard('jwt'))
    async connectShop(@Req() req, @Body() dto: ConnectShopDto) {
        const user = req.user;
        console.log(`[Handshake] Received connection request for shop: ${dto.shop} from user: ${user.email}`);

        // Pass userId to service
        const result = await this.shopifyService.connectShop(dto, user.id);
        console.log(`[Handshake] Connection result:`, result);
        return result;
    }

    @Get('products')
    @UseGuards(AuthGuard('jwt'))
    async getProducts(@Req() req) {
        const user = req.user;

        if (!user || !user.shopifyShop || !user.shopifyToken) {
            throw new HttpException('Shopify credentials not found. Please connect your store in Settings.', HttpStatus.UNAUTHORIZED); // Or BAD_REQUEST
        }

        const decryptedToken = await this.usersService.getDecryptedShopifyToken(user.id);
        return await this.shopifyService.getProducts(user.shopifyShop, decryptedToken);
    }
}
