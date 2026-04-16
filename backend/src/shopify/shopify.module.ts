import { Module, Global, forwardRef } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { ShopifyGateway } from './shopify.gateway';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from '../reports/reports.module';
import { SocialStoresModule } from '../social-stores/social-stores.module';
import { AuthModule } from '../auth/auth.module';
import { ShopifySyncService } from './shopify-sync.service';

@Global()
@Module({
    imports: [HttpModule, ConfigModule, UsersModule, forwardRef(() => ReportsModule), forwardRef(() => SocialStoresModule), forwardRef(() => AuthModule)],
    controllers: [ShopifyController],
    providers: [ShopifyService, ShopifyGateway, ShopifySyncService],
    exports: [ShopifyService, ShopifySyncService],
})
export class ShopifyModule { }
