import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ConnectShopDto } from './dto/connect-shop.dto';
import { UsersService } from '../users/users.service';
import { ShopifyGateway } from './shopify.gateway';

@Injectable()
export class ShopifyService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly shopifyGateway: ShopifyGateway,
    ) { }

    private async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async connectShop(dto: ConnectShopDto, userId?: string) {
        let user;

        if (userId) {
            user = await this.usersService.findById(userId);
        }

        // Fallback: Find user by shop or email (Legacy behavior or if userId lookup failed)
        if (!user) {
            const users = await this.usersService.getAllUsers();
            user = users.find(u => u.shopifyShop === dto.shop);

            if (!user && dto.email) {
                user = await this.usersService.findByEmail(dto.email);
            }
        }

        // --- Realtime Simulation Start ---
        // Step 1: Handshake (Already happening conceptually)
        this.shopifyGateway.emitStatusUpdate(dto.shop, 1, 'Initiating Handshake');
        await this.delay(1500);

        // Step 2: Verification
        this.shopifyGateway.emitStatusUpdate(dto.shop, 2, 'Verifying Credentials');
        await this.delay(2000);

        // Step 3: Syncing
        this.shopifyGateway.emitStatusUpdate(dto.shop, 3, 'Syncing Product Catalog');
        await this.delay(2500);

        // Step 4: Analyzing
        this.shopifyGateway.emitStatusUpdate(dto.shop, 4, 'Analyzing Historical Data');
        await this.delay(2000);
        // --- Realtime Simulation End ---

        if (user) {
            // Update existing
            await this.usersService.updateShopifyCredentials(user.id, dto.shop, dto.accessToken);

            // Update name if provided (from Shopify App Login)
            if (dto.name) {
                await this.usersService.updateProfile(user.id, { name: dto.name });
            }

            this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
            return { success: true, action: 'updated', userId: user.id };
        } else {
            // Only create new if we absolutely have to, but with JWT auth this branch should technically be unreachable if we require login
            // However, keeping fallback for robustness if logic changes
            const email = dto.email || `shop+${dto.shop}@stockbud.com`;
            const name = dto.shop.replace('.myshopify.com', '');
            const passwordHash = '$2b$10$NotARealPasswordHashForShopConnect' + Math.random();

            const newUser = await this.usersService.createUser(email, name, passwordHash);
            await this.usersService.updateShopifyCredentials(newUser.id, dto.shop, dto.accessToken);

            this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
            return { success: true, action: 'created', userId: newUser.id };
        }
    }

    async getOrders(shop: string, token: string) {
        if (!shop || !token) throw new HttpException('Missing Shopify credentials', HttpStatus.UNAUTHORIZED);

        try {
            const url = `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'X-Shopify-Access-Token': token,
                    },
                }),
            );
            return response.data.orders;
        } catch (error) {
            console.error('Error fetching orders:', error.response?.data || error.message);
            // Return empty array instead of throwing to allow dashboard to load empty state
            return [];
        }
    }

    async getProducts(shop: string, token: string) {
        if (!shop || !token) throw new HttpException('Missing Shopify credentials', HttpStatus.UNAUTHORIZED);

        try {
            const url = `https://${shop}/admin/api/2024-01/products.json?limit=50`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'X-Shopify-Access-Token': token,
                    },
                }),
            );
            return response.data.products;
        } catch (error) {
            console.error('Error fetching products:', error.response?.data || error.message);
            return [];
        }
    }
}
