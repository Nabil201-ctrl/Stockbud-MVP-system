import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule, makeCounterProvider, makeSummaryProvider } from '@willsoto/nestjs-prometheus';
import { HealthController } from './health.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsService } from './metrics.service';

const shopifySyncTotalProvider = makeCounterProvider({
    name: 'shopify_sync_total',
    help: 'Total number of Shopify sync operations',
    labelNames: ['shop', 'status'],
});

const ordersProcessedTotalProvider = makeCounterProvider({
    name: 'orders_processed_total',
    help: 'Total number of orders processed',
    labelNames: ['source', 'status'],
});

const aiUsageTokensTotalProvider = makeCounterProvider({
    name: 'ai_usage_tokens_total',
    help: 'Total number of AI tokens consumed',
    labelNames: ['type', 'source'],
});

const reportsGeneratedTotalProvider = makeCounterProvider({
    name: 'reports_generated_total',
    help: 'Total number of reports generated',
    labelNames: ['type'],
});

@Global()
@Module({
    imports: [
        TerminusModule,
        PrometheusModule.register({
            path: '/metrics',
            defaultMetrics: {
                enabled: true,
            },
        }),
    ],
    controllers: [HealthController],
    providers: [
        MetricsService,
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor,
        },
        makeCounterProvider({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'path', 'status'],
        }),
        makeSummaryProvider({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'path', 'status'],
        }),
        makeCounterProvider({
            name: 'backend_logs_total',
            help: 'Total number of logs by level',
            labelNames: ['level'],
        }),
        shopifySyncTotalProvider,
        ordersProcessedTotalProvider,
        aiUsageTokensTotalProvider,
        reportsGeneratedTotalProvider,
    ],
    exports: [
        PrometheusModule,
        MetricsService,
        shopifySyncTotalProvider,
        ordersProcessedTotalProvider,
        aiUsageTokensTotalProvider,
        reportsGeneratedTotalProvider
    ],
})
export class HealthModule { }

