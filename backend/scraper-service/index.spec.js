const { extractWithAI, runScrape } = require('./index');
const { chromium } = require('playwright');
const axios = require('axios');

jest.mock('playwright');

describe('Scraper Worker', () => {
    let mockPage;
    let mockBrowser;
    
    // Set a default OLLAMA_URL for the test environment if not provided
    // In this specific environment, we found it at 10.0.3.3
    const DEFAULT_OLLAMA_URL = 'http://10.0.3.3:11434';
    
    beforeAll(() => {
        if (!process.env.OLLAMA_URL) {
            process.env.OLLAMA_URL = DEFAULT_OLLAMA_URL;
            console.log(`Setting default OLLAMA_URL to ${DEFAULT_OLLAMA_URL} for tests`);
        }
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
        it('should extract products using real Ollama', async () => {
            // Ensure we have a model pulled (llama3 is confirmed to exist)
            process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

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
