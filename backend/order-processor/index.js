const express = require('express');
const amqp = require('amqplib');
const path = require('path');
require('dotenv').config();

// Use the Prisma client from the main backend node_modules
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const client = require('prom-client');
const app = express();
const port = process.env.ORDER_PROCESSOR_PORT || 3001;

// Prometheus Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const ordersProcessedCounter = new client.Counter({
    name: 'orders_processed_total',
    help: 'Total number of orders processed',
    labelNames: ['status'],
    registers: [register],
});

app.use(express.json());

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'order-processor-standalone' });
});

// RabbitMQ Consumer
async function consumeOrders() {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        console.log(`[Order Processor] Connecting to RabbitMQ at ${rabbitUrl}...`);

        const connection = await amqp.connect(rabbitUrl);
        const channel = await connection.createChannel();
        const queue = 'order_queue';

        await channel.assertQueue(queue, { durable: false });
        console.log(`[Order Processor] Waiting for messages in "${queue}".`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const rawContent = JSON.parse(msg.content.toString());
                    // Handle NestJS envelope if present (pattern/data)
                    const content = rawContent.data ? rawContent.data : rawContent;
                    const action = content.action || (rawContent.pattern === 'order_action' ? 'CREATE_ORDER' : null);

                    console.log(`[Order Processor] Processing action: ${action}`);

                    if (action === 'CREATE_ORDER') {
                        await processOrder(content.userId, content.order);
                    }

                    channel.ack(msg);
                } catch (err) {
                    console.error('[Order Processor] Error processing message:', err.message);
                    channel.ack(msg);
                }
            }
        });
    } catch (error) {
        console.error('[Order Processor] RabbitMQ connection failed:', error.message);
        setTimeout(consumeOrders, 5000);
    }
}

async function processOrder(userId, order) {
    console.log(`[Order Processor] Saving order for customer: ${order.customerName}`);

    try {
        // 1. Create the order in PostgreSQL
        const savedOrder = await prisma.order.create({
            data: {
                userId: userId,
                storeId: order.storeId || 'manual',
                customerName: order.customerName,
                customerEmail: order.customerEmail || null,
                totalAmount: order.totalAmount || 0,
                currency: order.currency || 'USD',
                source: order.source || 'social',
                status: 'delivered',
                items: order.items || [],
                createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
            }
        });

        console.log(`[Order Processor] Order ${savedOrder.id} saved to DB.`);

        // 2. Decrement inventory for each item
        const items = order.items || [];
        for (const item of items) {
            const productId = item.productId;
            if (!productId) continue;

            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product) {
                const quantity = item.quantity || 1;
                const newInventory = Math.max(0, (product.inventory || 0) - quantity);

                // Update variants JSON
                let variants = Array.isArray(product.variants) ? [...product.variants] : [];
                if (variants.length > 0) {
                    variants[0].inventory_quantity = Math.max(0, (parseFloat(variants[0].inventory_quantity) || 0) - quantity);
                }

                await prisma.product.update({
                    where: { id: productId },
                    data: {
                        inventory: newInventory,
                        variants: variants
                    }
                });
                console.log(`[Order Processor] Updated stock for product: ${product.title}. Remaining: ${newInventory}`);
            }
        }

        ordersProcessedCounter.inc({ status: 'success' });
    } catch (err) {
        console.error('[Order Processor] Database operation failed:', err.message);
        ordersProcessedCounter.inc({ status: 'error' });
    }
}

app.listen(port, () => {
    console.log(`Order Processor running on http://localhost:${port}`);
    consumeOrders();
});
