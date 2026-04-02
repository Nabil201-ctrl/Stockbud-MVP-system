import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopifyService } from './shopify.service';
import { UsersService } from '../users/users.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ConnectShopDto } from './dto/connect-shop.dto';
import { ReportsService } from '../reports/reports.service';

import { SocialStoresService } from '../social-stores/social-stores.service';

@Controller('shopify')
export class ShopifyController {
    constructor(
        private readonly shopifyService: ShopifyService,
        private readonly usersService: UsersService,
        private readonly reportsService: ReportsService,
        private readonly socialStoresService: SocialStoresService
    ) { }

    @Post('connect')
    @UseGuards(AuthGuard('jwt'))
    async connectShop(@Req() req, @Body() dto: ConnectShopDto) {
        const user = req.user;
        console.log(`[Handshake] Received connection request for shop: ${dto.shop} from user: ${user.email}`);


        const result = await this.shopifyService.connectShop(dto, user.id);
        console.log(`[Handshake] Connection result:`, result);
        return result;
    }

    @Get('products')
    @UseGuards(AuthGuard('jwt'))
    async getProducts(@Req() req) {
        const user = req.user;
        const activeShopId = user.activeShopId;
        const socialStore = user.socialStores?.find(s => s.id === activeShopId);

        if (socialStore) {
            return await this.socialStoresService.getProducts(socialStore.id);
        }

        if (!user || !user.shopifyShop || !user.shopifyToken) {
            throw new HttpException('Shopify credentials not found. Please connect your store in Settings.', HttpStatus.BAD_REQUEST);
        }

        const { first, last, after, before } = req.query;
        const limit = first ? parseInt(first as string) : (last ? undefined : 10);
        const lastLimit = last ? parseInt(last as string) : undefined;

        const decryptedToken = await this.usersService.getDecryptedShopifyToken(user.id);

        return await this.shopifyService.getProducts(user.shopifyShop, decryptedToken, {
            first: limit,
            last: lastLimit,
            after: after as string,
            before: before as string
        });
    }

    @Get('orders')
    @UseGuards(AuthGuard('jwt'))
    async getOrders(@Req() req) {
        const user = req.user;

        if (!user || !user.shopifyShop || !user.shopifyToken) {
            throw new HttpException('Shopify credentials not found. Please connect your store in Settings.', HttpStatus.BAD_REQUEST);
        }

        const { first, last, after, before } = req.query;
        const limit = first ? parseInt(first as string) : (last ? undefined : 20);
        const lastLimit = last ? parseInt(last as string) : undefined;

        const decryptedToken = await this.usersService.getDecryptedShopifyToken(user.id);

        return await this.shopifyService.getOrders(user.shopifyShop, decryptedToken, {
            first: limit,
            last: lastLimit,
            after: after as string,
            before: before as string
        });
    }

    @Post('pairing-code')
    @UseGuards(AuthGuard('jwt'))
    async generatePairingCode(@Req() req) {
        const user = req.user;
        const code = this.shopifyService.generatePairingCode(user.id);
        return { code, expiresIn: '10 minutes' };
    }

    @Post('connect-with-code')
    async connectWithCode(@Body() dto: { code: string; shop: string; accessToken: string }) {



        console.log(`[Shopify] Received token prefix: ${dto.accessToken?.substring(0, 8)}...`);
        if (!dto.accessToken || (!dto.accessToken.startsWith('shpat_') && !dto.accessToken.startsWith('shpua_'))) {
            throw new HttpException(`Invalid Shopify Access Token. Must be an Access Token starting with "shpat_" or "shpua_". Got prefix: ${dto.accessToken?.substring(0, 8)}`, HttpStatus.BAD_REQUEST);
        }

        const result = await this.shopifyService.connectWithCode(dto.code, dto.shop, dto.accessToken);
        if (!result.success) {
            const errorMessage = 'error' in result ? result.error : 'Connection failed';
            throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }


        if (result.success && (result as any).userId) {
            const userId = (result as any).userId;
            console.log(`[Handshake] Triggering welcome report for user ${userId}`);

            this.reportsService.generateWelcomeReport(userId);
        }

        return result;
    }
}
