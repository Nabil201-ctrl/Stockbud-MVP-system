import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import fetch, { Headers, Request, Response } from 'node-fetch';

if (!global.fetch) {
    (global.fetch as any) = fetch;
    (global.Headers as any) = Headers;
    (global.Request as any) = Request;
    (global.Response as any) = Response;
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS so the React frontend can talk to us
    // Enable CORS so the React frontend can talk to us
    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            // Allow localhost
            if (origin.includes('localhost')) return callback(null, true);
            // Allow cloudflare tunnels (common for Shopify Dev)
            if (origin.includes('trycloudflare.com')) return callback(null, true);
            // Allow ngrok
            if (origin.includes('ngrok-free.app')) return callback(null, true);

            // Standard Frontends
            if (origin === 'http://localhost:5173' || origin === 'http://localhost:5174') return callback(null, true);

            callback(null, true); // Permissive for MVP/Dev - Locking down would be better for Prod
        },
        credentials: true,
    });

    app.use(cookieParser());

    // DEBUG LOGGING MIDDLEWARE
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
// Trigger restart for migration
