import { Module, Global } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
    imports: [HttpModule, ConfigModule, UsersModule],
    controllers: [ShopifyController],
    providers: [ShopifyService],
    exports: [ShopifyService],
})
export class ShopifyModule { }
