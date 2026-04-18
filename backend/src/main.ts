import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from './common/logger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import fetch, { Headers, Request, Response } from 'node-fetch';
import { SanitizePipe } from './common/sanitize.pipe';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

if (!global.fetch) {
    (global.fetch as any) = fetch;
    (global.Headers as any) = Headers;
    (global.Request as any) = Request;
    (global.Response as any) = Response;
}

// Global BigInt serialization patch
(BigInt.prototype as any).toJSON = function () {
    return Number(this);
};

async function bootstrap() {
    const logger = new AppLogger();
    const app = await NestFactory.create(AppModule, {
        logger,
    });

    // Security Headers with strict CSP and HSTS
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "http:"],
                connectSrc: ["'self'", "https://api.stockbud.xyz", "https://stockbud.xyz", "https://www.stockbud.xyz", "https://shopify.stockbud.xyz"],
                upgradeInsecureRequests: [],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        crossOriginEmbedderPolicy: false,
    }));

    // Microservice connections
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'image_upload_events',
            queueOptions: { durable: true },
        },
    });

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'order_queue',
            queueOptions: { durable: false },
        },
    });

    await app.startAllMicroservices();
    logger.log('PostgreSQL Database connected successfully');
    logger.log('RabbitMQ Microservice transport started');

    // CORS Configuration
    app.enableCors({
        origin: (origin, callback) => {
            const allowedPatterns = [
                /^https:\/\/stockbud\.xyz$/,
                /^https:\/\/www\.stockbud\.xyz$/,
                /^https:\/\/shopify\.stockbud\.xyz$/,
                /^https:\/\/api\.stockbud\.xyz$/,
                /\.trycloudflare\.com$/,
                /\.ngrok-free\.app$/,
                /^http:\/\/62\.171\.155\.58(:\d+)?$/,
                /\.vercel\.app$/
            ];

            if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
                callback(null, true);
            } else {
                logger.warn(`CORS blocked for origin: ${origin}`);
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        credentials: true,
    });

    app.use(cookieParser());

    // Global validation and sanitization
    app.useGlobalPipes(
        new SanitizePipe(),
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    await app.listen(3000, '0.0.0.0');
    console.log('Backend is running on https://api.stockbud.xyz');
}
bootstrap();
