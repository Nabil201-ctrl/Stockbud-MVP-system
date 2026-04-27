const BaseScraper = require('./base');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GenericAIScraper extends BaseScraper {
    constructor(page, logger, config = {}) {
        super(page, logger);
        this.genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
        this.ollamaUrl = config.ollamaUrl;
        this.ollamaModel = config.ollamaModel || 'llama3';
    }

    async scrape(url) {
        this.logger.info(`Generic AI scraping: ${url}`);
        await this.page.goto(url);
        let allProducts = [];
        let hasNextPage = true;
        let pageCount = 0;
        const maxPages = 5; // Prevent infinite loops

        while (hasNextPage && pageCount < maxPages) {
            pageCount++;
            this.logger.info(`Scraping page ${pageCount} of ${url}`);
            
            await this.page.waitForTimeout(5000); // Wait for content
            
            // Prune HTML
            const html = await this.page.evaluate(() => {
                document.querySelectorAll('script, style, svg, iframe, noscript, link, meta, header, footer').forEach(el => el.remove());
                return document.body.innerHTML;
            });
            
            let products = await this.extractProducts(html);

            if (products && products.length > 0) {
                allProducts = allProducts.concat(products);
                this.logger.info(`Extracted ${products.length} products from page ${pageCount}`);
            } else {
                this.logger.warn(`No products found on page ${pageCount}`);
            }

            // Attempt to find and click a "Next" button
            try {
                const nextButton = await this.page.$('a:has-text("Next"), a.next, .pagination-next, [aria-label="Next"], a:text-is("»"), a:text-is(">")');
                
                if (nextButton) {
                    const isDisabled = await nextButton.evaluate(node => node.hasAttribute('disabled') || node.classList.contains('disabled'));
                    if (!isDisabled) {
                        this.logger.info('Navigating to next page...');
                        await nextButton.click();
                        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                    } else {
                        hasNextPage = false;
                    }
                } else {
                    hasNextPage = false;
                }
            } catch (navError) {
                this.logger.warn(`Pagination failed or reached end: ${navError.message}`);
                hasNextPage = false;
            }
        }

        return allProducts;
    }

    async extractProducts(html) {
        const prompt = `
            Extract product information from the following HTML content of a standalone e-commerce site.
            Focus on the product grid or list.
            Return ONLY a JSON array of objects with the following keys:
            - name (string)
            - sku (string or "N/A")
            - price (number)
            - inventory (number or 0)

            HTML content:
            ${html.substring(0, 45000)}
        `;

        // Use Ollama (Centralized in Base if we wanted, but keeping here for specific override)
        if (this.ollamaUrl) {
            try {
                this.logger.info(`Using Ollama for extraction at ${this.ollamaUrl}`);
                const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.ollamaModel,
                    prompt: prompt,
                    stream: false,
                    format: "json"
                });
                
                const resultText = response.data.response;
                return JSON.parse(resultText);
            } catch (ollamaError) {
                this.logger.error('Ollama extraction failed:', ollamaError.message);
            }
        }
        
        // Gemini Fallback
        if (this.genAI) {
            // ... (Gemini logic from previous version)
        }

        return [];
    }
}

module.exports = GenericAIScraper;
