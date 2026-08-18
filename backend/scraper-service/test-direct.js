const { runScrape } = require('./index.js');
const pino = require('pino');

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

async function test() {
    console.log('--- STARTING SCRAPER TEST ---');
    console.log('Using Groq model:', process.env.GROQ_MODEL || 'groq/compound-mini');

    const payload = {
        jobId: 'test-job-' + Date.now(),
        url: 'https://www.ebay.com/b/Laptops-Netbooks/175672/bn_1648276'
    };

    try {
        const result = await runScrape(payload);
        console.log('--- TEST COMPLETED ---');
        console.log('Success:', result.success);
        if (result.success) {
            console.log('Products found:', result.products.length);
            console.log('Data:', JSON.stringify(result.products, null, 2));
        } else {
            console.error('Error:', result.error);
        }
    } catch (err) {
        console.error('Test script crashed:', err);
    }
}

test();
