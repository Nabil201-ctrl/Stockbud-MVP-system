const amqp = require('amqplib');
const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const pino = require('pino');
require('dotenv').config();

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

const app = express();
const port = process.env.PORT || 3005;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const axios = require('axios');

async function extractWithAI(html) {
    const prompt = `
        Extract product information from the following HTML content of an e-commerce admin panel.
        Return the data as a JSON array of objects with the following keys:
        - name (string)
        - sku (string)
        - price (number)
        - inventory (number)

        HTML content:
        ${html.substring(0, 15000)}
    `;

    // Try Ollama first if configured
    if (process.env.OLLAMA_URL) {
        try {
            logger.info(`Using Ollama for extraction at ${process.env.OLLAMA_URL}`);
            const response = await axios.post(`${process.env.OLLAMA_URL}/api/generate`, {
                model: process.env.OLLAMA_MODEL || "llama3",
                prompt: prompt,
                stream: false,
                format: "json"
            });
            
            const resultText = response.data.response;
            return JSON.parse(resultText);
        } catch (ollamaError) {
            logger.error('Ollama extraction failed, falling back if possible:', ollamaError.message);
        }
    }

    // Fallback to Gemini
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(text);
        } catch (geminiError) {
            logger.error('Gemini extraction failed:', geminiError.message);
        }
    }

    return [];
}

async function runScrape(payload) {
    const { jobId, url, loginUrl, username, password } = payload;
    logger.info(`Starting scrape job ${jobId} for ${url}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        if (loginUrl && username && password) {
            logger.info(`Logging in to ${loginUrl}`);
            await page.goto(loginUrl);
            
            // Generic login attempt - in production this would be site-specific or AI-driven
            // For MVP, we'll try to find common selectors
            try {
                await page.fill('input[type="text"], input[type="email"], input[name="username"]', username);
                await page.fill('input[type="password"]', password);
                await page.click('button[type="submit"], input[type="submit"]');
                await page.waitForNavigation({ timeout: 10000 });
            } catch (loginErr) {
                logger.warn(`Initial login attempt failed, trying to proceed: ${loginErr.message}`);
            }
        }

        logger.info(`Navigating to ${url}`);
        await page.goto(url);
        await page.waitForTimeout(5000); // Wait for content to load

        const content = await page.content();
        const products = await extractWithAI(content);

        logger.info(`Extracted ${products.length} products`);

        // Send results back to backend (via API or another queue)
        // For now, we'll just log them and assume there's a callback mechanism
        return { success: true, products };

    } catch (error) {
        logger.error(`Scrape failed for job ${jobId}:`, error.message);
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

        logger.info('Connected to RabbitMQ, waiting for messages...');

        channel.consume('scraper_queue', async (msg) => {
            if (msg !== null) {
                const payload = JSON.parse(msg.content.toString());
                const result = await runScrape(payload.data || payload);
                
                // Acknowledge message
                channel.ack(msg);

                // Here we would typically push the result to a results queue or call a webhook
                logger.info(`Job ${payload.jobId} completed. Result: ${result.success}`);
            }
        });
    } catch (error) {
        logger.error('RabbitMQ connection failed:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}

connectRabbitMQ();

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'scraper-worker' }));
app.listen(port, () => logger.info(`Scraper worker health endpoint on port ${port}`));
