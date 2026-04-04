import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    async trackVisit(userId: string, storeId: string, storeType: 'shopify' | 'social', metadata?: any) {
        // 1. Log the trace
        await this.prisma.logTrace(userId, 'VISIT_STORE', storeType, storeId, metadata);

        // 2. If social store, update the visits counter
        if (storeType === 'social') {
            const store = await this.prisma.socialStore.findUnique({ where: { id: storeId } });
            if (store) {
                const date = new Date().toISOString().split('T')[0];
                let stats: any[] = Array.isArray(store.dailyStats) ? store.dailyStats : [];
                const idx = stats.findIndex(s => s.date === date);

                if (idx !== -1) {
                    stats[idx].visits += 1;
                } else {
                    stats.push({ date, visits: 1, inquiries: 0 });
                }

                if (stats.length > 30) stats.shift();

                await this.prisma.socialStore.update({
                    where: { id: storeId },
                    data: {
                        visits: (store.visits || 0) + 1,
                        dailyStats: stats
                    }
                });
            }
        }
    }

    async trackAction(userId: string, action: string, entityType?: string, entityId?: string, metadata?: any) {
        await this.prisma.logTrace(userId, action, entityType, entityId, metadata);
    }
}
