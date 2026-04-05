import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OrderMicroserviceMessage } from './orders.interface';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import * as CircuitBreaker from 'opossum';

@Injectable()
export class OrdersProducerService {
    private breaker: CircuitBreaker;

    constructor(
        @Inject('ORDERS_SERVICE') private client: ClientProxy,
        @InjectMetric('orders_processed_total')
        private readonly orderCounter: Counter<string>,
    ) {
        this.breaker = new CircuitBreaker(
            (message: OrderMicroserviceMessage) => this.client.emit('order_action', message).toPromise(),
            {
                timeout: 5000, // 5s timeout
                errorThresholdPercentage: 50, // open if 50% fail
                resetTimeout: 30000, // wait 30s to retry
            }
        );

        this.breaker.fallback(() => ({ success: false, message: 'Registry unavailable, circuit open.' }));
    }

    async sendOrderMessage(message: OrderMicroserviceMessage) {
        console.log(`[OrdersProducer] Attempting to emit order_action for user: ${message.userId}`);
        try {
            const result = await this.breaker.fire(message);
            console.log(`[OrdersProducer] Message emitted successfully.`);
            this.orderCounter.inc({ source: (message as any).source || 'unknown', status: 'success' });
            return result;
        } catch (error) {
            console.error(`[OrdersProducer] FAILED to emit message:`, error.message);
            this.orderCounter.inc({ source: (message as any).source || 'unknown', status: 'failed' });
            throw error;
        }
    }
}
