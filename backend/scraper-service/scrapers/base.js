/**
 * Base Scraper class
 */
class BaseScraper {
    constructor(page, logger, config = {}) {
        this.page = page;
        this.logger = logger;
        this.ollamaUrl = config.ollamaUrl;
        this.ollamaModel = config.ollamaModel || 'llama3';
        this.genAI = config.geminiApiKey; // Placeholder for fallback
    }

    async discoverLoginSelectors(html) {
        if (!this.ollamaUrl) {
            return {
                username: 'input[type="text"], input[type="email"], input[name="username"]',
                password: 'input[type="password"]',
                submit: 'button[type="submit"], input[type="submit"]'
            };
        }

        try {
            this.logger.info("Using AI to discover login selectors...");
            const prompt = `
                Analyze the following HTML and identify the CSS selectors for the login form.
                Return ONLY a JSON object with these keys: "username", "password", "submit".
                
                HTML: ${html.substring(0, 10000)}
            `;

            const axios = require('axios');
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.ollamaModel,
                prompt: prompt,
                stream: false,
                format: "json"
            });

            return JSON.parse(response.data.response);
        } catch (err) {
            this.logger.warn(`AI selector discovery failed, using defaults: ${err.message}`);
            return {
                username: 'input[type="text"], input[type="email"], input[name="username"]',
                password: 'input[type="password"]',
                submit: 'button[type="submit"], input[type="submit"]'
            };
        }
    }

    async login(loginUrl, username, password) {
        this.logger.info(`Attempting login at ${loginUrl}`);
        await this.page.goto(loginUrl);
        await this.page.waitForTimeout(2000);

        const html = await this.page.content();
        const selectors = await this.discoverLoginSelectors(html);
        
        try {
            await this.page.fill(selectors.username, username);
            await this.page.fill(selectors.password, password);
            await this.page.click(selectors.submit);
            await this.page.waitForNavigation({ timeout: 10000 });
            
            // Check if login was successful (e.g., no more password field)
            const isLoggedOut = await this.page.$(selectors.password);
            if (isLoggedOut) {
                throw new Error("Login form still visible after attempt. Credentials might be wrong.");
            }

            this.logger.info("Login appears successful!");
            return true;
        } catch (err) {
            this.logger.error(`Login failed: ${err.message}`);
            return false;
        }
    }

    async scrape(url) {
        throw new Error('Scrape method not implemented');
    }

    async extractProducts(html) {
        throw new Error('ExtractProducts method not implemented');
    }
}

module.exports = BaseScraper;
