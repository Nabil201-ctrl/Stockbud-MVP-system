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
        await this.page.waitForTimeout(5000); // Wait for content
        
        const html = await this.page.content();
        let products = await this.extractProducts(html);

        // If AI returned nothing, try a different approach (e.g. looking for lists)
        if (!products || products.length === 0) {
            this.logger.warn("AI returned no products, trying to identify product area...");
            // We could add more complex logic here, like scrolling or clicking "Load More"
        }

        return products || [];
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
            ${html.substring(0, 15000)}
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
