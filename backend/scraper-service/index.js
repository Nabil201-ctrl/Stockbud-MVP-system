const amqp = require('amqplib');
const { chromium } = require('playwright');
const express = require('express');
const pino = require('pino');
const client = require('prom-client');
const Scrapers = require('./scrapers');
require('dotenv').config();

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

// Prometheus Metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const jobsProcessed = new client.Counter({
    name: 'scraper_jobs_total',
    help: 'Total number of scrape jobs processed',
    labelNames: ['status', 'platform']
});

const productsExtracted = new client.Counter({
    name: 'scraper_products_extracted_total',
    help: 'Total number of products extracted',
    labelNames: ['platform']
});

const scrapeDuration = new client.Histogram({
    name: 'scraper_extraction_duration_seconds',
    help: 'Total duration of a scrape job in seconds',
    labelNames: ['platform']
});

const app = express();
const port = process.env.PORT || 3005;

async function runScrape(payload) {
    const { jobId, url, loginUrl, username, password, platform } = payload;
    const sitePlatform = (platform || 'generic').toLowerCase();
    
    logger.info(`Starting scrape job ${jobId} for ${url} (Platform: ${sitePlatform})`);
    const jobStartTime = Date.now();

    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Select scraper
        const ScraperClass = Scrapers[sitePlatform] || Scrapers.generic;
        const scraper = new ScraperClass(page, logger, {
            ollamaUrl: process.env.OLLAMA_URL,
            ollamaModel: process.env.OLLAMA_MODEL,
            geminiApiKey: process.env.GEMINI_API_KEY
        });

        // Handle login if credentials provided
        if (loginUrl && username && password) {
            await scraper.login(loginUrl, username, password);
        }

        // Run scrape
        const products = await scraper.scrape(url);
        
        const duration = (Date.now() - jobStartTime) / 1000;
        scrapeDuration.observe({ platform: sitePlatform }, duration);
        jobsProcessed.inc({ status: 'success', platform: sitePlatform });
        productsExtracted.inc({ platform: sitePlatform }, products.length);

        logger.info(`Job ${jobId} finished. Extracted ${products.length} products in ${duration}s`);

        return { success: true, products };

    } catch (error) {
        logger.error(`Scrape failed for job ${jobId}:`, error.message);
        jobsProcessed.inc({ status: 'failure', platform: sitePlatform });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

async function connectRabbitMQ() {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqp.connect(rabbitUrl);
        const channel = await connection.createChannel();
        
        await channel.assertQueue('scraper_queue', { durable: false });
        await channel.assertQueue('scraper_results', { durable: false });

        logger.info('Connected to RabbitMQ, waiting for messages...');

        channel.consume('scraper_queue', async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    const jobData = content.data || content;
                    
                    const result = await runScrape(jobData);
                    
                    channel.ack(msg);

                    const resultPayload = {
                        jobId: jobData.jobId,
                        siteId: jobData.siteId,
                        success: result.success,
                        products: result.products,
                        error: result.error,
                        timestamp: new Date().toISOString()
                    };

                    channel.sendToQueue('scraper_results', Buffer.from(JSON.stringify({
                        pattern: 'scrape_result',
                        data: resultPayload
                    })));

                    logger.info(`Job ${jobData.jobId} result sent to scraper_results.`);
                } catch (err) {
                    logger.error('Error processing message:', err.message);
                    channel.nack(msg, false, false); // Don't requeue if it's a parsing error
                }
            }
        });
    } catch (error) {
        logger.error('RabbitMQ connection failed:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}

if (require.main === module) {
    connectRabbitMQ();
    
    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', client.register.contentType);
            res.end(await client.register.metrics());
        } catch (ex) {
            res.status(500).end(ex);
        }
    });

    app.get('/health', (req, res) => res.json({ status: 'UP', service: 'scraper-worker' }));
    app.listen(port, '0.0.0.0', () => logger.info(`Scraper worker health and metrics on port ${port}`));
}

