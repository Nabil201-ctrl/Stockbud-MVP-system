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
        const maxPages = 5;

        while (hasNextPage && pageCount < maxPages) {
            pageCount++;
            this.logger.info(`Scraping page ${pageCount} of ${url}`);
            
            await this.page.waitForTimeout(2000);
            
            const jsonLdProducts = await this.extractJsonLd();
            if (jsonLdProducts && jsonLdProducts.length > 0) {
                this.logger.info(`Extracted ${jsonLdProducts.length} products via JSON-LD on page ${pageCount}`);
                allProducts = allProducts.concat(jsonLdProducts);
            } else {
                const prunedContent = await this.page.evaluate(() => {
                    const selectors = 'script, style, svg, iframe, noscript, link, meta, header, footer, nav, aside';
                    document.querySelectorAll(selectors).forEach(el => el.remove());
                    
                    const body = document.body;
                    return body.innerText;
                });
                
                let products = await this.extractProducts(prunedContent);

                if (products && products.length > 0) {
                    allProducts = allProducts.concat(products);
                    this.logger.info(`Extracted ${products.length} products via AI from page ${pageCount}`);
                } else {
                    this.logger.warn(`No products found on page ${pageCount}`);
                }
            }

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

    async extractProducts(text) {
        const prompt = `
            Extract product information from the following text content of an e-commerce site.
            Return ONLY a JSON array of objects with the following keys:
            - name (string)
            - sku (string or "N/A")
            - price (number)
            - inventory (number or 0)

            Content:
            ${text.substring(0, 30000)}
        `;

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
        
        if (this.genAI) {
            try {
                this.logger.info('Ollama failed or unavailable, falling back to Gemini...');
                const model = this.genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash",
                    generationConfig: { responseMimeType: "application/json" }
                });

                const result = await model.generateContent(prompt);
                const resultText = result.response.text();
                return JSON.parse(resultText);
            } catch (geminiError) {
                this.logger.error('Gemini extraction fallback failed:', geminiError.message);
            }
        }

        return [];
    }

    async extractJsonLd() {
        try {
            const data = await this.page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                return scripts.map(s => {
                    try {
                        return JSON.parse(s.textContent);
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
            });

            const products = [];
            
            const processItem = (item) => {
                if (item['@type'] === 'Product') {
                    products.push({
                        name: item.name,
                        sku: item.sku || item.mpn || 'N/A',
                        price: parseFloat(item.offers?.price || item.offers?.[0]?.price || 0),
                        inventory: item.offers?.availability?.includes('InStock') ? 100 : 0
                    });
                } else if (item['@graph'] && Array.isArray(item['@graph'])) {
                    item['@graph'].forEach(processItem);
                } else if (Array.isArray(item)) {
                    item.forEach(processItem);
                }
            };

            data.forEach(processItem);
            return products;
        } catch (err) {
            this.logger.warn(`JSON-LD extraction failed: ${err.message}`);
            return [];
        }
    }
}

module.exports = GenericAIScraper;
