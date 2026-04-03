import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
    constructor(
        @InjectMetric('backend_logs_total') private readonly logsCounter: Counter<string>,
    ) { }

    recordLog(level: 'info' | 'warn' | 'error' | 'debug') {
        this.logsCounter.inc({ level });
    }
}
