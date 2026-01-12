import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
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
    app.enableCors({
        origin: 'http://localhost:5173', // Must be specific for credentials to work
        credentials: true,
    });

    app.use(cookieParser());

    await app.listen(3000);
    console.log('Backend is running on http://localhost:3000');
}
bootstrap();
