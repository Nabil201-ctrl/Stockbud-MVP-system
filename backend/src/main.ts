import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import fetch, { Headers, Request, Response } from 'node-fetch';

if (!global.fetch) {
    (global.fetch as any) = fetch;
    (global.Headers as any) = Headers;
    (global.Request as any) = Request;
    (global.Response as any) = Response;
}

import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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
    app.enableCors({
        origin: (origin, callback) => {

            if (!origin) return callback(null, true);

            if (origin.includes('localhost')) return callback(null, true);

            if (origin.includes('trycloudflare.com')) return callback(null, true);

            if (origin.includes('ngrok-free.app')) return callback(null, true);


            if (origin === 'http://localhost:5173' || origin === 'http://localhost:5174') return callback(null, true);

            callback(null, true);
        },
        credentials: true,
    });

    app.use(cookieParser());


    app.use((req, res, next) => {
        const logLine = `\n[${new Date().toISOString()}] ${req.method} ${req.url}
Headers: ${JSON.stringify(req.headers)}
Cookies: ${JSON.stringify(req.cookies)}
------------------------------------------------`;
        fs.appendFileSync(path.join(__dirname, '..', 'debug_auth.log'), logLine);
        next();
    });

    await app.listen(3000);
    console.log('Backend is running on http://localhost:3000');
}
bootstrap();

