import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ConnectShopDto } from './dto/connect-shop.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ShopifyService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) { }

    async connectShop(dto: ConnectShopDto) {
        // Find user by shop or email
        const users = await this.usersService.getAllUsers();
        let user = users.find(u => u.shopifyShop === dto.shop);

        if (!user && dto.email) {
            user = await this.usersService.findByEmail(dto.email);
        }

        if (user) {
            // Update existing
            await this.usersService.updateShopifyCredentials(user.id, dto.shop, dto.accessToken);
            return { success: true, action: 'updated', userId: user.id };
        } else {
            // Create new holder user
            const email = dto.email || `shop+${dto.shop}@stockbud.com`;
            const name = dto.shop.replace('.myshopify.com', '');
            // Create a random password hash since they won't login via password initially
            const passwordHash = '$2b$10$NotARealPasswordHashForShopConnect' + Math.random();

            const newUser = await this.usersService.createUser(email, name, passwordHash);
            await this.usersService.updateShopifyCredentials(newUser.id, dto.shop, dto.accessToken);
            return { success: true, action: 'created', userId: newUser.id };
        }
    }

    async getOrders(shop: string, token: string) {
        if (!shop || !token) throw new HttpException('Missing Shopify credentials', HttpStatus.UNAUTHORIZED);

        try {
            const url = `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=50`;
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
