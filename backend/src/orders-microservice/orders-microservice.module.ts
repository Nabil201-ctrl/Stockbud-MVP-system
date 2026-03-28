import { Module } from '@nestjs/common';
import { OrdersMicroserviceController } from './orders-microservice.controller';
import { OrdersMicroserviceService } from './orders-microservice.service';

@Module({
    imports: [],
    controllers: [OrdersMicroserviceController],
    providers: [OrdersMicroserviceService],
})
export class OrdersMicroserviceModule { }
