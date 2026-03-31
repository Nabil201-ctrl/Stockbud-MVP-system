import { Module } from '@nestjs/common';
import { ImageMicroserviceController } from './image-microservice.controller';
@Module({
    controllers: [ImageMicroserviceController],
})
export class ImageMicroserviceModule { }
