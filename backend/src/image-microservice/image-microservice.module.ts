import { Module } from '@nestjs/common';
import { ImageMicroserviceController } from './image-microservice.controller';
import { SocialStoresModule } from '../social-stores/social-stores.module';

@Module({
    imports: [SocialStoresModule],
    controllers: [ImageMicroserviceController],
})
export class ImageMicroserviceModule { }
