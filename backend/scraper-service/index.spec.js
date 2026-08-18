const { extractWithAI, runScrape } = require('./index');
const { chromium } = require('playwright');
const axios = require('axios');

jest.mock('playwright');

describe('Scraper Worker', () => {
    let mockPage;
    let mockBrowser;
    
    beforeAll(() => {
        process.env.GROQ_MODEL = process.env.GROQ_MODEL || 'groq/compound-mini';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockPage = {
            goto: jest.fn().mockResolvedValue({}),
            waitForSelector: jest.fn().mockResolvedValue({}),
            $: jest.fn().mockResolvedValue({ fill: jest.fn(), click: jest.fn(), evaluate: jest.fn() }),
            waitForLoadState: jest.fn().mockResolvedValue({}),
            waitForTimeout: jest.fn().mockResolvedValue({}),
            evaluate: jest.fn().mockResolvedValue('<html><body><div class="product"><h1>Real AI Product</h1><span class="price">99.99</span></div></body></html>'),
            click: jest.fn().mockResolvedValue({}),
            close: jest.fn(),
        };

        mockBrowser = {
            newContext: jest.fn().mockResolvedValue({
                newPage: jest.fn().mockResolvedValue(mockPage),
            }),
            close: jest.fn(),
        };

        chromium.launch.mockResolvedValue(mockBrowser);
        
        // Spy on axios but let it through
        jest.spyOn(axios, 'post');
    });

    afterEach(() => {
        axios.post.mockRestore();
    });

    describe('extractWithAI', () => {
        it('should extract products using Groq', async () => {
            process.env.GROQ_MODEL = process.env.GROQ_MODEL || 'groq/compound-mini';

            const result = await extractWithAI('<html><body><table><tr><td>Product A</td><td>SKU-123</td><td>10.99</td><td>50</td></tr></table></body></html>');

            expect(axios.post).toHaveBeenCalled();
            expect(Array.isArray(result)).toBe(true);
            // We don't strictly assert the content since AI can be variable, but it should be an array
        }, 120000); // 2 minutes for AI generation
    });

    describe('runScrape', () => {
        it('should perform a full scrape cycle with real AI', async () => {
            const payload = {
                jobId: 'job-1',
                url: 'http://example.com/products',
            };

            // Mock page.$ to return null for the next button so it only runs one page
            mockPage.$.mockImplementation((selector) => {
                if (selector.includes('Next') || selector.includes('pagination')) return Promise.resolve(null);
                return Promise.resolve({ fill: jest.fn(), click: jest.fn(), evaluate: jest.fn() });
            });

            const result = await runScrape(payload);

            expect(chromium.launch).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(Array.isArray(result.products)).toBe(true);
        }, 180000); // 3 minutes for full cycle
    });
});
