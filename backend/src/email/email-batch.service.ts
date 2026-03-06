import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from './email.service';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailQueueItem {
    id: string;
    type: 'doc' | 'weekly' | 'monthly' | 'welcome' | 'instant' | 'system';
    priority: number; // lower number = higher priority
    options: {
        to: { email: string; name?: string }[];
        subject: string;
        htmlContent: string;
        attachment?: { name: string; content: string };
    };
    addedAt: string;
    failedAttempts: number;
}

@Injectable()
export class EmailBatchService implements OnModuleInit {
    private readonly filePath = path.join(process.cwd(), 'data', 'email-queue.json');
    private queue: EmailQueueItem[] = [];
    private sentToday: number = 0;
    private readonly DAILY_LIMIT = 300;
    private readonly logger = new Logger(EmailBatchService.name);

    constructor(private readonly emailService: EmailService) { }

    onModuleInit() {
        this.ensureDir();
        this.loadQueue();
        this.resetDailyCounter();
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
                this.logger.error('Failed to load email queue', err);
                this.queue = [];
            }
        }
    }

    private saveQueue() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.queue, null, 2), 'utf8');
        } catch (err) {
            this.logger.error('Failed to save email queue', err);
        }
    }

    // A Cron job to reset the daily counter at midnight
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    resetDailyCounter() {
        this.sentToday = 0;
        this.logger.log('Reset daily email sending counter.');
    }

    /**
     * Add an email to the queue based on priority.
     * Priority: 1 (Highest, e.g., Welcome, Instant Docs), 2 (Monthly), 3 (Weekly).
     */
    async queueEmail(item: Omit<EmailQueueItem, 'id' | 'addedAt' | 'failedAttempts'>) {
        const queueItem: EmailQueueItem = {
            ...item,
            id: Math.random().toString(36).substr(2, 9),
            addedAt: new Date().toISOString(),
            failedAttempts: 0,
        };
        this.queue.push(queueItem);
        // Sort queue by priority (1 is highest) and then by addedAt
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        });
        this.saveQueue();
        this.logger.log(`Queued email for ${item.options.to[0]?.email} (Type: ${item.type}, Priority: ${item.priority})`);
    }

    /**
     * Process the queue in batches every 15 minutes to regulate flow and avoid bursts.
     * Respects the 300/day limit.
     */
    @Cron('0 */15 * * * *')
    async processQueue() {
        if (this.queue.length === 0) return;

        // How much quota we have left for today
        const quotaLeft = this.DAILY_LIMIT - this.sentToday;
        if (quotaLeft <= 0) {
            this.logger.warn(`Daily email limit of ${this.DAILY_LIMIT} reached. Queue processing paused until tomorrow.`);
            return;
        }

        // Send a batch of up to 50 emails per 15-minute chunk, up to remaining quota
        const batchSize = Math.min(50, quotaLeft, this.queue.length);
        const batch = this.queue.splice(0, batchSize);

        let sentCount = 0;

        for (const item of batch) {
            try {
                // Actually send the email using EmailService
                const sent = await this.emailService.sendEmail(item.options);
                if (sent) {
                    sentCount++;
                    this.sentToday++;
                } else {
                    item.failedAttempts++;
                    if (item.failedAttempts < 3) {
                        this.queue.push(item); // Requeue if failed less than 3 times
                    } else {
                        this.logger.error(`Email to ${item.options.to[0]?.email} failed 3 times. Discarding.`);
                    }
                }
            } catch (err) {
                this.logger.error(`Error sending email to ${item.options.to[0]?.email}`, err);
                item.failedAttempts++;
                if (item.failedAttempts < 3) {
                    this.queue.push(item);
                }
            }
        }

        // Re-sort in case we pushed failed items back
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        });

        this.saveQueue();
        this.logger.log(`Processed batch: sent ${sentCount} emails. Total sent today: ${this.sentToday}/${this.DAILY_LIMIT}`);
    }
}
