import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { DocxGeneratorService } from './docx-generator.service';

@Global()
@Module({
    imports: [HttpModule, ConfigModule],
    providers: [EmailService, DocxGeneratorService],
    exports: [EmailService, DocxGeneratorService],
})
export class EmailModule { }
