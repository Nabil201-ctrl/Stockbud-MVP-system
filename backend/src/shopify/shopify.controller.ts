import { Controller, Get, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('shopify')
export class ShopifyController {
    constructor(private readonly shopifyService: ShopifyService) { }

    @Get('products')
    async getProducts(
        @Headers('x-shopify-shop') shop: string,
        @Headers('x-shopify-token') token: string,
    ) {
        if (!shop || !token) {
            throw new HttpException('Missing shop or token headers', HttpStatus.BAD_REQUEST);
        }
        return await this.shopifyService.getProducts(shop, token);
    }
}
