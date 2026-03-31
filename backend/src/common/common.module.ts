import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { GeminiService } from './gemini.service';
import { UsageService } from './usage.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EncryptionService, GeminiService, UsageService],
    exports: [EncryptionService, GeminiService, UsageService],
})
export class CommonModule { }
