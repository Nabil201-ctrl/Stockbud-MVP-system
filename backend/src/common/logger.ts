import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LokiLogger implements LoggerService {
    private logger: pino.Logger;

    constructor() {
        this.logger = pino({
            level: 'info',
            transport: {
                targets: [
                    {
                        target: 'pino-pretty',
                        options: { colorize: true },
                    },
                    {
                        target: 'pino-loki',
                        options: {
                            host: process.env.LOKI_HOST || 'http://localhost:3100',
                            labels: { app: 'stockbud-backend' },
                        },
                    },
                ],
            },
        });
    }

    log(message: any, ...optionalParams: any[]) {
        this.logger.info(message, ...optionalParams);
    }

    error(message: any, ...optionalParams: any[]) {
        this.logger.error(message, ...optionalParams);
    }

    warn(message: any, ...optionalParams: any[]) {
        this.logger.warn(message, ...optionalParams);
    }

    debug?(message: any, ...optionalParams: any[]) {
        this.logger.debug(message, ...optionalParams);
    }

    verbose?(message: any, ...optionalParams: any[]) {
        this.logger.trace(message, ...optionalParams);
    }
}
