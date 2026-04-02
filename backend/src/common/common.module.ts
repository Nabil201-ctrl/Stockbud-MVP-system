import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { GeminiService } from './gemini.service';
import { UsageService } from './usage.service';
import { PlanService } from './plan.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EncryptionService, GeminiService, UsageService, PlanService],
    exports: [EncryptionService, GeminiService, UsageService, PlanService],
})
export class CommonModule { }
