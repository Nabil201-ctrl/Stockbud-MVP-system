import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Order } from '../orders/orders.interface';

@Injectable()
export class OrdersMicroserviceService {
    private readonly dataDir = path.join(process.cwd(), 'data');
    private readonly ordersPath = path.join(process.cwd(), 'data', 'orders.json');

    async processCreateOrder(order: Order) {
        console.log(`[OrderMicroservice] Processing order ${order.id} for customer ${order.customerName}...`);

        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }

        await this.saveOrder(order);

        console.log(`[OrderMicroservice] Order ${order.id} processed successfully!`);
        return { success: true, orderId: order.id };
    }

    private async saveOrder(order: Order) {
        let ordersData: { orders: Order[] } = { orders: [] };
        try {
            const content = await fs.readFile(this.ordersPath, 'utf8');
            ordersData = JSON.parse(content);
        } catch {
            // File doesn't exist or is empty
        }

        if (!ordersData.orders) ordersData.orders = [];
        ordersData.orders.push(order);

        await fs.writeFile(this.ordersPath, JSON.stringify(ordersData, null, 2), 'utf8');
    }
}
