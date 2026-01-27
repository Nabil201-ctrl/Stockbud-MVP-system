import { Module, Global, forwardRef } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { ShopifyGateway } from './shopify.gateway';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from '../reports/reports.module';

@Global()
@Module({
    imports: [HttpModule, ConfigModule, UsersModule, forwardRef(() => ReportsModule)],
    controllers: [ShopifyController],
    providers: [ShopifyService, ShopifyGateway],
    exports: [ShopifyService],
})
export class ShopifyModule { }
