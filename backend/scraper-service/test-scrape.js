/**
 * Utility script to test scrapers locally without RabbitMQ
 */
const { chromium } = require('playwright');
const scrapers = require('./scrapers');
const pino = require('pino');
require('dotenv').config();

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

async function testScrape(url, platform = 'generic') {
    logger.info(`Testing scrape for ${url} using ${platform}`);

    const browser = await chromium.launch({ headless: false }); // Show browser for testing
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        const ScraperClass = scrapers[platform.toLowerCase()] || scrapers.generic;
        const config = {
            geminiApiKey: process.env.GEMINI_API_KEY,
            ollamaUrl: process.env.OLLAMA_URL,
            ollamaModel: process.env.OLLAMA_MODEL
        };
        
        const scraper = new ScraperClass(page, logger, config);
        const products = await scraper.scrape(url);

        console.log('\n--- EXTRACTED PRODUCTS ---');
        console.table(products);
        console.log('--------------------------\n');

    } catch (error) {
        logger.error(`Test scrape failed: ${error.message}`);
    } finally {
        // await browser.close();
        console.log('Browser left open for inspection. Close it manually.');
    }
}

// Get args from command line
const url = process.argv[2];
const platform = process.argv[3] || 'generic';

if (!url) {
    console.log('Usage: node test-scrape.js <url> [platform]');
    process.exit(1);
}

testScrape(url, platform);
