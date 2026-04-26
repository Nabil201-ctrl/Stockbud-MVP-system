import { Module, forwardRef } from '@nestjs/common';
import { SocialStoresService } from './social-stores.service';
import { SocialStoresController } from './social-stores.controller';
import { PrismaModule } from '../database/prisma.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
    imports: [PrismaModule, forwardRef(() => ShopifyModule)],
    providers: [SocialStoresService],
    controllers: [SocialStoresController],
    exports: [SocialStoresService]
})
export class SocialStoresModule { }
