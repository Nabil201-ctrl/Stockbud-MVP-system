import { Controller, Get, Post, Body, Query, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopifyService } from './shopify.service';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
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
        private readonly socialStoresService: SocialStoresService,
        private readonly authService: AuthService
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
        const activeShopId = user.activeShopId;
        const socialStore = user.socialStores?.find(s => s.id === activeShopId);

        if (socialStore) {
            const orders = await this.socialStoresService.getOrders(socialStore.id);
            // Format to match Shopify-like structure for the frontend if needed
            return {
                orders: orders.map(o => ({
                    id: o.id,
                    name: `SB-${o.id.toString().substring(0, 4)}`,
                    created_at: o.createdAt,
                    financial_status: 'paid',
                    total_price: o.totalAmount.toString(),
                    customer: {
                        first_name: o.customerName || 'Social',
                        last_name: 'Customer',
                        email: o.customerEmail
                    },
                    line_items: o.items || []
                })),
                pageInfo: { hasNextPage: false }
            };
        }

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

    @Get('status')
    async getStatus(@Query('shop') shop: string) {
        if (!shop) throw new HttpException('Shop query parameter is required', HttpStatus.BAD_REQUEST);
        const users = await this.usersService.getAllUsers();
        const user = users.find(u => u.shopifyShop === shop);

        if (user) {
            const authResult = await this.authService.login(user);
            return {
                isConnected: true,
                user: { id: user.id, name: user.name, email: user.email },
                token: authResult.access_token
            };
        }
        return { isConnected: false };
    }

    @Post('auto-connect')
    async autoConnect(@Body() dto: { shop: string; accessToken: string; name?: string; email?: string }) {
        console.log(`[Shopify] Auto-connecting shop: ${dto.shop}`);

        if (!dto.accessToken) {
            throw new HttpException('Missing Shopify Access Token', HttpStatus.BAD_REQUEST);
        }

        const result = await this.shopifyService.connectShop(dto as any);

        if (result.success && result.userId) {
            this.reportsService.generateWelcomeReport(result.userId);
            const user = await this.usersService.findById(result.userId);
            const authResult = await this.authService.login(user);
            return { ...result, token: authResult.access_token };
        }

        return result;
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

            const user = await this.usersService.findById(userId);
            const authResult = await this.authService.login(user);
            return { ...result, token: authResult.access_token };
        }

        return result;
    }

    @Post('webhook/uninstall')
    @UseGuards(ApiKeyGuard)
    async handleUninstall(@Body() payload: { shop: string }) {
        console.log(`[Webhook] Handling uninstall for ${payload.shop}`);
        // Logic to disable sync for this shop
        return { success: true };
    }

    @Post('webhook/redact-shop')
    @UseGuards(ApiKeyGuard)
    async redactShop(@Body() payload: { shop_domain: string }) {
        console.log(`[GDPR] Redacting shop data for ${payload.shop_domain}`);
        // Logic to delete shop data
        return { success: true };
    }

    @Post('webhook/redact-customer')
    @UseGuards(ApiKeyGuard)
    async redactCustomer(@Body() payload: any) {
        console.log(`[GDPR] Redacting customer data for shop ${payload.shop_domain}`);
        // Logic to find and delete customer data
        return { success: true };
    }

    @Post('webhook/data-request')
    @UseGuards(ApiKeyGuard)
    async dataRequest(@Body() payload: any) {
        console.log(`[GDPR] Processing data request for shop ${payload.shop_domain}`);
        // Logic to retrieve data
        return { success: true };
    }
}
