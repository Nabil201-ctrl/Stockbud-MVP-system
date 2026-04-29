import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { DocxGeneratorService } from './docx-generator.service';
import { EmailBatchService } from './email-batch.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EmailService, DocxGeneratorService, EmailBatchService],
    exports: [EmailService, DocxGeneratorService, EmailBatchService],
})
export class EmailModule { }
