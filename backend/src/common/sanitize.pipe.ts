import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import * as createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

@Injectable()
export class SanitizePipe implements PipeTransform {
    private dompurify;

    constructor() {
        const window = new JSDOM('').window;
        this.dompurify = createDOMPurify(window as any);
    }

    transform(value: any, metadata: ArgumentMetadata) {
        if (typeof value === 'string') {
            return this.dompurify.sanitize(value);
        }

        if (typeof value === 'object' && value !== null) {
            this.sanitizeObject(value);
        }

        return value;
    }

    private sanitizeObject(obj: any) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = this.dompurify.sanitize(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.sanitizeObject(obj[key]);
            }
        }
    }
}
