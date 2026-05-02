import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

export interface MonitoringLogItem {
    id: string;
    level: string;
    message: string;
    context?: any;
    addedAt: string;
    failedAttempts: number;
}

@Injectable()
export class MonitoringService implements OnModuleInit {
    private readonly filePath = path.join(process.cwd(), 'data', 'monitoring-queue.json');
    private queue: MonitoringLogItem[] = [];
    private readonly logger = new Logger(MonitoringService.name);

    onModuleInit() {
        this.ensureDir();
        this.loadQueue();
    }

    private ensureDir() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private loadQueue() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.queue = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            } catch (err) {
                this.logger.error('Failed to load monitoring queue', err);
                this.queue = [];
            }
        }
    }

    private saveQueue() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.queue, null, 2), 'utf8');
        } catch (err) {
            this.logger.error('Failed to save monitoring queue', err);
        }
    }

    async queueLog(level: string, message: string, context?: any) {
        const queueItem: MonitoringLogItem = {
            id: Math.random().toString(36).substring(2, 11),
            level,
            message,
            context,
            addedAt: new Date().toISOString(),
            failedAttempts: 0,
        };
        this.queue.push(queueItem);
        this.saveQueue();
    }

    @Cron('0 */1 * * * *') // Process every 1 minute
    async processQueue() {
        if (this.queue.length === 0) return;

        const batchSize = Math.min(50, this.queue.length);
        const batch = this.queue.splice(0, batchSize);

        for (const item of batch) {
            try {
                await this.sendToExternalMonitoring(item);
                // If successful, log is already removed from queue
            } catch (err: any) {
                item.failedAttempts++;
                if (item.failedAttempts < 3) {
                    this.queue.push(item);
                } else {
                    // Show system error message in backend logs after 3 retries
                    this.logger.error(`SYSTEM ERROR: Failed to process monitoring log after 3 attempts. Log ID: ${item.id}, Message: ${item.message}, Error: ${err.message}`);
                }
            }
        }

        this.saveQueue();
    }

    private async sendToExternalMonitoring(item: MonitoringLogItem): Promise<void> {
        // TODO: Replace this with the actual integration logic (Datadog, Sentry, Webhook, etc.)
        // This simulates an external API call that might fail
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // For demonstration, simulating failure if context has "simulate_failure: true"
                if (item.context && item.context.simulate_failure) {
                    reject(new Error('Simulated network/API failure for monitoring external service'));
                } else {
                    resolve();
                }
            }, 100);
        });
    }
}
