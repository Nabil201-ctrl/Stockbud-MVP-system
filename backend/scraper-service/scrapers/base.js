const { groqJson } = require('../groq');

class BaseScraper {
    constructor(page, logger, config = {}) {
        this.page = page;
        this.logger = logger;
        this.groqApiKey = config.groqApiKey;
        this.groqModel = config.groqModel;
        this.genAI = config.geminiApiKey;
    }

    async discoverLoginSelectors(html) {
        if (!this.groqApiKey) {
            return {
                username: 'input[type="text"], input[type="email"], input[name="username"]',
                password: 'input[type="password"]',
                submit: 'button[type="submit"], input[type="submit"]'
            };
        }

        try {
            this.logger.info("Using Groq to discover login selectors...");
            const prompt = `
                Analyze the following HTML and identify the CSS selectors for the login form.
                Return ONLY a JSON object with these keys: "username", "password", "submit".
                
                HTML: ${html.substring(0, 10000)}
            `;

            return await groqJson(prompt, {
                apiKey: this.groqApiKey,
                model: this.groqModel
            });
        } catch (err) {
            this.logger.warn(`AI selector discovery failed, using defaults: ${err.message}`);
            return {
                username: 'input[type="text"], input[type="email"], input[name="username"]',
                password: 'input[type="password"]',
                submit: 'button[type="submit"], input[type="submit"]'
            };
        }
    }

    async discoverLoginUrl(baseUrl) {
        this.logger.info(`Attempting to discover login URL for ${baseUrl}`);
        try {
            await this.page.goto(baseUrl, { waitUntil: 'load', timeout: 15000 }).catch(e => this.logger.warn(`Initial goto failed: ${e.message}`));
            await this.page.waitForTimeout(2000);
            
            // 1. Look for common login links/buttons in the page
            const loginLinkSelectors = [
                'a:has-text("Log In")', 'a:has-text("Login")', 'a:has-text("Sign In")', 'a:has-text("Account")',
                'a[href*="/login"]', 'a[href*="/signin"]', 'a[href*="/account"]',
                'button:has-text("Log In")', 'button:has-text("Login")', 'button:has-text("Sign In")'
            ];

            for (const selector of loginLinkSelectors) {
                try {
                    const link = await this.page.$(selector);
                    if (link) {
                        const href = await link.getAttribute('href');
                        if (href) {
                            const absoluteUrl = new URL(href, baseUrl).toString();
                            this.logger.info(`Found potential login URL via link: ${absoluteUrl}`);
                            return absoluteUrl;
                        }
                    }
                } catch (e) {
                    // Ignore selector errors
                }
            }

            // 2. Try common login paths
            const commonPaths = ['/login', '/signin', '/account/login', '/user/login', '/admin/login', '/wp-login.php'];
            for (const path of commonPaths) {
                const testUrl = new URL(path, baseUrl).toString();
                try {
                    const response = await this.page.request.get(testUrl);
                    if (response.status() === 200) {
                        const text = await response.text();
                        if (text.toLowerCase().includes('password') || text.toLowerCase().includes('login')) {
                            this.logger.info(`Found potential login URL via common path: ${testUrl}`);
                            return testUrl;
                        }
                    }
                } catch (e) {
                    // Ignore request errors
                }
            }

            this.logger.warn(`Could not discover login URL for ${baseUrl}`);
            return null;
        } catch (err) {
            this.logger.error(`Error during login URL discovery: ${err.message}`);
            return null;
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
