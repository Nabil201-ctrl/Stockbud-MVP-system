import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule, makeCounterProvider, makeSummaryProvider } from '@willsoto/nestjs-prometheus';
import { HealthController } from './health.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsService } from './metrics.service';

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
    ],
    exports: [PrometheusModule, MetricsService],
})
export class HealthModule { }
