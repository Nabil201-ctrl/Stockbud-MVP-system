import { Module } from '@nestjs/common';
import { SocialStoresController } from './social-stores.controller';
import { SocialStoresService } from './social-stores.service';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [SocialStoresController],
    providers: [SocialStoresService],
})
export class SocialStoresModule { }
