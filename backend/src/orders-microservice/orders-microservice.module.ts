import { Module } from '@nestjs/common';
import { OrdersMicroserviceController } from './orders-microservice.controller';
import { OrdersMicroserviceService } from './orders-microservice.service';
import { HealthModule } from '../health/health.module';

@Module({
    imports: [HealthModule],
    controllers: [OrdersMicroserviceController],
    providers: [OrdersMicroserviceService],
})
export class OrdersMicroserviceModule { }
