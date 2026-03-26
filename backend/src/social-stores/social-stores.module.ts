import { Module, forwardRef } from '@nestjs/common';
import { SocialStoresController } from './social-stores.controller';
import { SocialStoresService } from './social-stores.service';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [CommonModule, forwardRef(() => UsersModule)],
    controllers: [SocialStoresController],
    providers: [SocialStoresService],
    exports: [SocialStoresService],
})
export class SocialStoresModule { }
