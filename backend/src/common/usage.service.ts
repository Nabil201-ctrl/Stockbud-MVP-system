import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface TokenUsageRecord {
    userId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    timestamp: string;
    source: 'chat' | 'report' | 'other';
}

@Injectable()
export class UsageService {
    private readonly filePath = path.join(process.cwd(), 'data', 'token_usage.json');

    constructor() {
        this.ensureFileExists();
    }

    private ensureFileExists() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([]), 'utf8');
        }
    }

    public async logUsage(record: Omit<TokenUsageRecord, 'timestamp'>) {
        try {
            const data = await fs.promises.readFile(this.filePath, 'utf8');
            const usage: TokenUsageRecord[] = JSON.parse(data);

            usage.push({
                ...record,
                timestamp: new Date().toISOString()
            });

            // Keep only last 10,000 records to avoid huge files
            if (usage.length > 10000) {
                usage.shift();
            }

            await fs.promises.writeFile(this.filePath, JSON.stringify(usage, null, 2), 'utf8');
        } catch (error) {
            console.error('[UsageService] Error logging token usage:', error);
        }
    }

    public async getUsage(): Promise<TokenUsageRecord[]> {
        try {
            const data = await fs.promises.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('[UsageService] Error reading token usage:', error);
            return [];
        }
    }

    public async getAggregateUsage() {
        const usage = await this.getUsage();
        const stats = {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalTotalTokens: 0,
            byModel: {} as Record<string, number>,
            bySource: {} as Record<string, number>,
            dailyUsage: {} as Record<string, number>
        };

        for (const record of usage) {
            stats.totalInputTokens += record.inputTokens || 0;
            stats.totalOutputTokens += record.outputTokens || 0;
            stats.totalTotalTokens += record.totalTokens || 0;

            stats.byModel[record.model] = (stats.byModel[record.model] || 0) + (record.totalTokens || 0);
            stats.bySource[record.source] = (stats.bySource[record.source] || 0) + (record.totalTokens || 0);

            const day = record.timestamp.split('T')[0];
            stats.dailyUsage[day] = (stats.dailyUsage[day] || 0) + (record.totalTokens || 0);
        }

        return stats;
    }
}
