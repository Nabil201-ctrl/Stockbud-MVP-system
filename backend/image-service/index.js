const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const amqp = require('amqplib');
const CircuitBreaker = require('opossum');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Fallback to parent for shared keys if any

const client = require('prom-client');
const pino = require('pino');

const logger = pino({
    level: 'info',
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: { colorize: true }
            },
            {
                target: 'pino-loki',
                options: {
                    host: process.env.LOKI_HOST || 'http://localhost:3100',
                    labels: { app: 'image-service' }
                }
            }
        ]
    }
});

const app = express();
const port = process.env.IMAGE_SERVICE_PORT || 3002;
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// Prometheus Registry and Default Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom Metrics
const imageUploadsCounter = new client.Counter({
    name: 'image_uploads_total',
    help: 'Total number of image uploads',
    labelNames: ['status'],
});
const cloudinaryErrorCounter = new client.Counter({
    name: 'cloudinary_errors_total',
    help: 'Total number of Cloudinary upload errors',
});
const uploadDurationHistogram = new client.Histogram({
    name: 'image_upload_duration_seconds',
    help: 'Duration of image uploads in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

register.registerMetric(imageUploadsCounter);
register.registerMetric(cloudinaryErrorCounter);
register.registerMetric(uploadDurationHistogram);

app.use(cors());
app.use(express.json());

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// RabbitMQ State
let rabbitChannel = null;
const QUEUE_NAME = 'image_upload_events';

// Circuit Breaker for Cloudinary
const uploadToCloudinary = (file) => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'stockbud_products',
                resource_type: 'auto'
            },
            (error, result) => {
                const duration = (Date.now() - start) / 1000;
                uploadDurationHistogram.observe(duration);

                if (error) {
                    logger.error({ error }, '[Cloudinary] Upload Error');
                    cloudinaryErrorCounter.inc();
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        stream.end(file.buffer);
    });
};

const cloudinaryBreaker = new CircuitBreaker(uploadToCloudinary, {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
});
cloudinaryBreaker.fallback(() => { throw new Error('Cloudinary integration currently unstable.'); });

// RabbitMQ Initialization
async function initRabbit() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        rabbitChannel = await connection.createChannel();
        await rabbitChannel.assertQueue(QUEUE_NAME, { durable: true });
        logger.info(` [Image Service] Connected to RabbitMQ at ${RABBIT_URL}`);

        connection.on('error', (err) => {
            logger.error({ err }, '[RabbitMQ] Connection error');
            setTimeout(initRabbit, 5000);
        });

        connection.on('close', () => {
            logger.warn('[RabbitMQ] Connection closed, retrying...');
            setTimeout(initRabbit, 5000);
        });

        // 2. Consume processing requests from main server
        const inboundQueue = 'image_processing_requests';
        await rabbitChannel.assertQueue(inboundQueue, { durable: false });
        rabbitChannel.consume(inboundQueue, (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                logger.info({ pattern: content.pattern, data: content.data }, '[Image Service] Received async processing request');
                // In a real scenario, this would trigger resizing, blurring, watermark, etc.
                rabbitChannel.ack(msg);
            }
        });

    } catch (err) {
        logger.error({ error: err.message }, '[Image Service] Failed to connect to RabbitMQ');
        setTimeout(initRabbit, 5000);
    }
}
initRabbit();

// Circuit Breaker for RabbitMQ Messaging
const publishToRabbit = async (message) => {
    if (!rabbitChannel) throw new Error('RabbitMQ channel not available');
    return rabbitChannel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), { persistent: true });
};

const rabbitBreaker = new CircuitBreaker(publishToRabbit, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
});
rabbitBreaker.fallback(() => logger.warn('[RabbitMQ] Circuit Open: Message suppressed to prevent blocking.'));

// Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        microservice: 'image-processor',
        rabbit: rabbitChannel ? 'CONNECTED' : 'DISCONNECTED',
        circuit: {
            cloudinary: cloudinaryBreaker.opened ? 'OPEN' : 'CLOSED',
            rabbit: rabbitBreaker.opened ? 'OPEN' : 'CLOSED'
        }
    });
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.array('images', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files provided' });
    }

    try {
        logger.info(`[Image Service] Processing ${req.files.length} images...`);

        // 1. Upload to Cloudinary using Opossum breaker
        const uploadPromises = req.files.map(file => cloudinaryBreaker.fire(file));
        const urls = await Promise.all(uploadPromises);

        // 2. Notify Main Platform via RabbitMQ using Opossum breaker
        await rabbitBreaker.fire({
            type: 'IMAGE_UPLOAD_DONE',
            timestamp: new Date().toISOString(),
            urls,
            metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
        });

        logger.info(`[Image Service] Upload successful. urls count: ${urls.length}`);
        imageUploadsCounter.inc({ status: 'success' });
        res.json({ success: true, urls });
    } catch (error) {
        logger.error({ error: error.message }, '[Image Service] Error during upload');
        imageUploadsCounter.inc({ status: 'error' });
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    logger.info(`Image Microservice running on http://localhost:${port}`);
    logger.info(` Managing image uploads independently with RabbitMQ & Circuit Breaker.`);
});
