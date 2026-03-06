import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { GeminiService } from './gemini.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EncryptionService, GeminiService],
    exports: [EncryptionService, GeminiService],
})
export class CommonModule { }
