import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class LokiService {
    private readonly logger = new Logger(LokiService.name);
    private locator: string;

    constructor(private configService: ConfigService) {
        this.locator = this.configService.get<string>('LOKI_HOST') || 'http://localhost:3100';
    }

    /**
     * Pushes manual logs to Loki if needed (Pino handles most of this though)
     */
    async pushLog(stream: Record<string, string>, message: string) {
        try {
            const now = Date.now() * 1000000; // Nanoseconds
            await axios.post(`${this.locator}/loki/api/v1/push`, {
                streams: [
                    {
                        stream,
                        values: [[now.toString(), message]],
                    },
                ],
            });
        } catch (err) {
            this.logger.warn(`Failed to push log to Loki: ${err.message}`);
        }
    }

    /**
     * Get log volume stats
     */
    async getVolumeStats(query: string = '{app="stockbud-backend"}') {
        try {
            const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const end = new Date().toISOString();
            const response = await axios.get(`${this.locator}/loki/api/v1/index/volume`, {
                params: { query, start, end }
            });
            return response.data;
        } catch (err) {
            this.logger.error(`Failed to fetch Loki volume stats: ${err.message}`);
            return null;
        }
    }

    /**
     * Health Check for Loki
     */
    async isReady(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.locator}/ready`);
            return response.data === 'ready';
        } catch {
            return false;
        }
    }
}
