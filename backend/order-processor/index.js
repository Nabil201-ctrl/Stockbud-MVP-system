const express = require('express');
const amqp = require('amqplib');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.ORDER_PROCESSOR_PORT || 3001;

// Paths to JSON data (using the parent data directory)
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const STORES_FILE = path.join(DATA_DIR, 'social_stores.json');

app.use(express.json());

// Basic health check and simple dashboard endpoint
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Order Processor Status</title>
                <style>
                    body { font-family: 'Inter', sans-serif; background: #0f172a; color: #fff; padding: 40px; }
                    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 24px; border-radius: 16px; }
                    h1 { color: #34d399; margin-top: 0; }
                    .status { display: flex; align-items: center; gap: 10px; font-weight: 600; }
                    .dot { width: 12px; height: 12px; border-radius: 50%; background: #34d399; box-shadow: 0 0 10px #34d399; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Order Processor Internal Dashboard</h1>
                    <div class="status"><div class="dot"></div> System Online via RabbitMQ</div>
                    <p>Processing orders for StockBud Social Stores...</p>
                    <p>Current Time: ${new Date().toLocaleString()}</p>
                </div>
            </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'order-processor-express' });
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
        console.log(`[*] Order Processor waiting for messages in "${queue}".`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log('[x] Received message:', content.action);

                if (content.action === 'CREATE_ORDER') {
                    await processOrder(content.order);
                }

                channel.ack(msg);
            }
        });

        connection.on('error', (err) => {
            console.error('[RabbitMQ] Connection error', err);
            setTimeout(consumeOrders, 5000);
        });

    } catch (error) {
        console.error('[Order Processor] RabbitMQ connection failed:', error.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(consumeOrders, 5000);
    }
}

const CircuitBreaker = require('opossum');

async function processOrderInternal(order) {
    console.log(`[Order Processor] Processing order ${order.id} for ${order.customerName}...`);
    // Ensure data directory exists
    await fs.ensureDir(DATA_DIR);

    // 1. Save order to orders.json (using existing orders.json in data/)
    let orders = [];
    if (await fs.pathExists(ORDERS_FILE)) {
        try {
            orders = await fs.readJson(ORDERS_FILE);
        } catch (e) {
            console.error('Error reading orders file, resetting');
        }
    }
    orders.push(order);
    await fs.writeJson(ORDERS_FILE, orders, { spaces: 2 });
    console.log(`[Order Processor] Order saved to ${ORDERS_FILE}`);

    // 2. Update stock in social_stores.json
    if (await fs.pathExists(STORES_FILE)) {
        const socialStores = await fs.readJson(STORES_FILE);
        let updated = false;

        for (const store of socialStores) {
            if (store.products && Array.isArray(store.products)) {
                for (const item of order.items) {
                    const product = store.products.find(p => p.id === item.productId);
                    if (product) {
                        const oldStock = product.stock;
                        product.stock = Math.max(0, product.stock - item.quantity);
                        console.log(`[Order Processor] Stock update in store "${store.name}" for "${product.name}": ${oldStock} -> ${product.stock}`);
                        updated = true;
                    }
                }
            }
        }

        if (updated) {
            await fs.writeJson(STORES_FILE, socialStores, { spaces: 2 });
            console.log(`[Order Processor] social_stores.json updated successfully.`);
        }
    } else {
        console.warn(`[Order Processor] Stores file not found at ${STORES_FILE}, skipping stock update.`);
    }
}

const orderBreaker = new CircuitBreaker(processOrderInternal, {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 20000,
});

orderBreaker.fallback(() => console.error('[Order Processor] Circuit Open: Failed to process order. Saving for retry...'));

async function processOrder(order) {
    return orderBreaker.fire(order);
}

app.listen(port, () => {
    console.log(`Order Processor Express server running on http://localhost:${port}`);
    consumeOrders();
});
