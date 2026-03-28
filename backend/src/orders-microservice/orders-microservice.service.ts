import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Order } from '../orders/orders.interface';

@Injectable()
export class OrdersMicroserviceService {
    private readonly dataDir = path.join(process.cwd(), 'data');
    private readonly ordersPath = path.join(process.cwd(), 'data', 'orders.json');
    private readonly storesPath = path.join(process.cwd(), 'data', 'social-stores.json');

    async processCreateOrder(order: Order) {
        console.log(`[OrderMicroservice] Processing order ${order.id} for customer ${order.customerName}...`);

        // Ensure data directory exists
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }

        // 1. Save order to orders.json
        await this.saveOrder(order);

        // 2. Decrement stock in social-stores.json
        await this.updateStock(order);

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

    private async updateStock(order: Order) {
        try {
            const content = await fs.readFile(this.storesPath, 'utf8');
            const data = JSON.parse(content);

            if (data.products && Array.isArray(data.products)) {
                for (const item of order.items) {
                    const product = data.products.find(p => p.id === item.productId);
                    if (product) {
                        product.stock = Math.max(0, product.stock - item.quantity);
                        console.log(`[OrderMicroservice] Updated stock for ${product.name}: new stock ${product.stock}`);
                    }
                }
                await fs.writeFile(this.storesPath, JSON.stringify(data, null, 2), 'utf8');
            }
        } catch (e) {
            console.error('[OrderMicroservice] Failed to update stock:', e.message);
        }
    }
}
