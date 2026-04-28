const { extractWithAI, runScrape } = require('./index');
const { chromium } = require('playwright');
const axios = require('axios');

jest.mock('playwright');
jest.mock('axios');

describe('Scraper Worker', () => {
    let mockPage;
    let mockBrowser;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn().mockResolvedValue({}),
            waitForSelector: jest.fn().mockResolvedValue({}),
            $: jest.fn().mockResolvedValue({ fill: jest.fn(), click: jest.fn(), evaluate: jest.fn() }),
            waitForLoadState: jest.fn().mockResolvedValue({}),
            waitForTimeout: jest.fn().mockResolvedValue({}),
            evaluate: jest.fn().mockResolvedValue('<html><body>Test Content</body></html>'),
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
    });

    describe('extractWithAI', () => {
        it('should extract products using axios if OLLAMA_URL is set', async () => {
            process.env.OLLAMA_URL = 'http://ollama:11434';
            axios.post.mockResolvedValue({
                data: { response: JSON.stringify([{ name: 'Test Product', price: 10 }]) }
            });

            const result = await extractWithAI('<html></html>');

            expect(axios.post).toHaveBeenCalled();
            expect(result).toEqual([{ name: 'Test Product', price: 10 }]);
            delete process.env.OLLAMA_URL;
        });
    });

    describe('runScrape', () => {
        it('should perform a full scrape cycle', async () => {
            const payload = {
                jobId: 'job-1',
                url: 'http://example.com/products',
                loginUrl: 'http://example.com/login',
                username: 'admin',
                password: 'password'
            };

            // Mock extractWithAI (since it's in the same file, we can't easily mock it without extra effort, 
            // so we let it run and mock the AI calls it makes)
            axios.post.mockResolvedValue({
                data: { response: JSON.stringify([{ name: 'Scraped Product', price: 20 }]) }
            });
            process.env.OLLAMA_URL = 'http://ollama:11434';

            const result = await runScrape(payload);

            expect(chromium.launch).toHaveBeenCalled();
            expect(mockPage.goto).toHaveBeenCalledWith('http://example.com/login');
            expect(mockPage.goto).toHaveBeenCalledWith('http://example.com/products');
            expect(result.success).toBe(true);
            expect(result.products.length).toBeGreaterThan(0);
            
            delete process.env.OLLAMA_URL;
        });
    });
});
