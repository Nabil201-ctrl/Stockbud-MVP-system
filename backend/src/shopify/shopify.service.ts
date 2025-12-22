import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ShopifyService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) { }

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
