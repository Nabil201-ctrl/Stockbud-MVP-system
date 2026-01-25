import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [HttpModule, UsersModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
})
export class PaymentsModule { }
