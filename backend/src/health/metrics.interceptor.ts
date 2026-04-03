import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Summary } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(
        @InjectMetric('http_request_duration_seconds') private readonly duration: Summary<string>,
        @InjectMetric('http_requests_total') private readonly counter: Counter<string>,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        if (!req) return next.handle();

        const { method, path: url } = req;
        const start = Date.now();

        return next.handle().pipe(
            tap({
                next: (res) => {
                    const statusCode = context.switchToHttp().getResponse()?.statusCode || 200;
                    const duration = (Date.now() - start) / 1000;
                    this.duration.observe({ method, path: url, status: statusCode.toString() }, duration);
                    this.counter.inc({ method, path: url, status: statusCode.toString() });
                },
                error: (err) => {
                    const statusCode = err.status || 500;
                    const duration = (Date.now() - start) / 1000;
                    this.duration.observe({ method, path: url, status: statusCode.toString() }, duration);
                    this.counter.inc({ method, path: url, status: statusCode.toString() });
                }
            })
        );
    }
}
