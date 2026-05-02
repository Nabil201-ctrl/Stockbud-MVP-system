import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../database/prisma.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
    imports: [PrismaModule, ShopifyModule],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService]
})
export class ProductsModule { }
