const express = require('express');
const rateLimit = require('express-rate-limit');
const amqp = require('amqplib');
require('dotenv').config();
const client = require('prom-client');
const pino = require('pino');

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

const app = express();
const port = process.env.PORT || 3003;

// Prometheus Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const ordersProcessedCounter = new client.Counter({
    name: 'orders_queued_total',
    help: 'Total number of orders queued',
    labelNames: ['status'],
    registers: [register],
});

app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many orders processed from this IP, please wait.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// RabbitMQ Connection setup for publishing
let amqpChannel;
async function connectRabbitMQ() {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        logger.info(`[Order Receiver] Connecting to RabbitMQ at ${rabbitUrl}...`);
        const connection = await amqp.connect(rabbitUrl);
        amqpChannel = await connection.createChannel();
        await amqpChannel.assertQueue('order_queue', { durable: false });
        logger.info(`[Order Receiver] Producer ready for "order_queue".`);
    } catch (error) {
        logger.error('[Order Receiver] RabbitMQ connection failed:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'order-receiver-producer' });
});

// REST Endpoint to trigger order queuing
app.post('/create-order', async (req, res) => {
    const { userId, order } = req.body;

    if (!userId || !order) {
        return res.status(400).json({ error: 'Missing userId or order data' });
    }

    try {
        const orderMessage = {
            action: 'CREATE_ORDER',
            userId,
            order: {
                ...order,
                createdAt: order.createdAt || new Date().toISOString()
            }
        };

        // Standard NestJS RMQ format for pattern matchings if needed
        const payload = {
            pattern: 'order_action',
            data: orderMessage
        };

        if (amqpChannel) {
            amqpChannel.sendToQueue('order_queue', Buffer.from(JSON.stringify(payload)));
            logger.info(`[Order Receiver] Queued order for user ${userId}`);
            ordersProcessedCounter.inc({ status: 'success' });
            return res.json({ success: true, message: 'Order queued successfully' });
        } else {
            throw new Error('RabbitMQ channel not available');
        }
    } catch (err) {
        logger.error('[Order Receiver] Error queuing order:', err.message);
        ordersProcessedCounter.inc({ status: 'error' });
        res.status(500).json({ error: 'Failed to queue order', details: err.message });
    }
});

app.listen(port, () => {
    logger.info(`Order Receiver (Producer) running on http://localhost:${port}`);
});
