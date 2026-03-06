import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
    private keys: string[] = [];
    private currentKeyIndex = 0;
    private currentGenAI: GoogleGenerativeAI | null = null;

    constructor(private configService: ConfigService) {
        const keysStr = this.configService.get<string>('GEMINI_API_KEYS') || this.configService.get<string>('GEMINI_API_KEY') || '';
        this.keys = keysStr.split(',').map(k => k.trim()).filter(k => !!k);

        if (this.keys.length === 0) {
            console.warn('[GeminiService] No GEMINI_API_KEYS found in environment variables. Mock responses will be used.');
        } else {
            console.log(`[GeminiService] Loaded ${this.keys.length} Gemini API keys.`);
            this.initClient();
        }
    }

    private initClient() {
        if (this.keys.length > 0) {
            this.currentGenAI = new GoogleGenerativeAI(this.keys[this.currentKeyIndex]);
        }
    }

    public getModel(modelName: string) {
        return this.currentGenAI ? this.currentGenAI.getGenerativeModel({ model: modelName }) : null;
    }

    public switchKey() {
        if (this.keys.length > 1) {
            const oldIndex = this.currentKeyIndex;
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
            console.warn(`[GeminiService] API key error. Switching from key index ${oldIndex} to ${this.currentKeyIndex}`);
            this.initClient();
        } else {
            console.error(`[GeminiService] API error occurred, but only 1 key is available. Cannot rotate.`);
        }
    }

    public hasKeys(): boolean {
        return this.keys.length > 0;
    }

    public async executeWithRetry<T>(modelName: string, operation: (model: any) => Promise<T>): Promise<T> {
        if (!this.hasKeys()) {
            throw new Error("No Gemini API keys available");
        }

        let attempts = 0;
        const maxAttempts = this.keys.length;

        while (attempts < maxAttempts) {
            try {
                const model = this.getModel(modelName);
                if (!model) throw new Error("Could not initialize model");

                return await operation(model);
            } catch (error) {
                console.error(`[GeminiService] Operation failed on key index ${this.currentKeyIndex}:`, error.message || error);
                this.switchKey();
                attempts++;

                // If we've exhausted all keys, throw the final error
                if (attempts >= maxAttempts) {
                    throw new Error(`All ${maxAttempts} Gemini API keys failed. Last error: ${error.message}`);
                }
            }
        }

        throw new Error("Execute with retry failed unexpectedly");
    }
}
