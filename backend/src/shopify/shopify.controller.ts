import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Add this import
import { ShopifyService } from './shopify.service';
import { UsersService } from '../users/users.service'; // Add this import
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ConnectShopDto } from './dto/connect-shop.dto';
import { ReportsService } from '../reports/reports.service';

@Controller('shopify')
export class ShopifyController {
    constructor(
        private readonly shopifyService: ShopifyService,
        private readonly usersService: UsersService,
        private readonly reportsService: ReportsService
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

    /**
     * Generate a pairing code for the authenticated user.
     * The user will enter this code in the Shopify App.
     */
    @Post('pairing-code')
    @UseGuards(AuthGuard('jwt'))
    async generatePairingCode(@Req() req) {
        const user = req.user;
        const code = this.shopifyService.generatePairingCode(user.id);
        return { code, expiresIn: '10 minutes' };
    }

    /**
     * Connect a Shopify store using a pairing code.
     * This endpoint is PUBLIC (no JWT required) because the Shopify App
     * uses the code to authenticate instead of email/password.
     */
    @Post('connect-with-code')
    async connectWithCode(@Body() dto: { code: string; shop: string; accessToken: string }) {
        // Validate Token Format (Offline Access Token)
        if (!dto.accessToken || !dto.accessToken.startsWith('shpat_')) {
            throw new HttpException('Invalid Shopify Access Token. Must be an Offline Access Token starting with "shpat_".', HttpStatus.BAD_REQUEST);
        }

        const result = await this.shopifyService.connectWithCode(dto.code, dto.shop, dto.accessToken);
        if (!result.success) {
            const errorMessage = 'error' in result ? result.error : 'Connection failed';
            throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }

        // Trigger Initial Reports
        if (result.success && (result as any).userId) {
            const userId = (result as any).userId;
            console.log(`[Handshake] Triggering initial reports for user ${userId}`);
            // Generate baseline reports asynchronously
            this.reportsService.generateReport(userId, 'sales');
            this.reportsService.generateReport(userId, 'inventory');
            this.reportsService.generateReport(userId, 'revenue');
        }

        return result;
    }
}
