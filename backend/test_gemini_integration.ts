import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';
import * as dotenv from 'dotenv';
import fetch, { Headers, Request, Response } from 'node-fetch';

async function run() {
    console.log('Starting Gemini Verification (Final Check)...');

    // Load .env
    const result = dotenv.config({ path: path.join(__dirname, '.env') });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY missing');
        process.exit(1);
    }

    // Polyfill
    // @ts-ignore
    global.fetch = fetch;
    // @ts-ignore
    global.Headers = Headers;
    // @ts-ignore
    global.Request = Request;
    // @ts-ignore
    global.Response = Response;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    try {
        console.log('Sending request to Gemini (gemini-flash-latest)...');
        const result = await model.generateContent("Hello! Confirm you are working.");
        console.log('Response received:');
        console.log('-----------------------------------');
        console.log(result.response.text());
        console.log('-----------------------------------');
        console.log('SUCCESS: Gemini Integration Fully Verified');
    } catch (error: any) {
        console.error('FAILURE: Generation Failed');
        console.error(error.message);
    }
}

run();
