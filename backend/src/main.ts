import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import fetch, { Headers, Request, Response } from 'node-fetch';

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

import { Transport, MicroserviceOptions } from '@nestjs/microservices';


async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Security Headers
    app.use(helmet());

    // Connect to Image Microservice via RabbitMQ
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'image_upload_events',
            queueOptions: {
                durable: true
            },
        },
    });

    await app.startAllMicroservices();
    console.log('PostgreSQL Database connected successfully via Prisma');
    console.log('RabbitMQ Microservice transport started successfully');


    app.enableCors({
        origin: (origin, callback) => {
            // Allow if local development or specified secure tunnels
            const allowedPatterns = [
                /^http:\/\/localhost:\d+$/,
                /\.trycloudflare\.com$/,
                /\.ngrok-free\.app$/,
                /^https:\/\/www\.stockbud\.xyz$/,
                /^https:\/\/stockbud\.xyz$/,
                /^http:\/\/62\.171\.155\.58(:\d+)?$/,
                /\.vercel\.app$/



            ];

            if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked for origin: ${origin}`);
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        credentials: true,
    });

    app.use(cookieParser());

    // Global validation for input DTOs
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    await app.listen(3000, '0.0.0.0');
    console.log('Backend is running on https://api.stockbud.xyz');
}
bootstrap();
