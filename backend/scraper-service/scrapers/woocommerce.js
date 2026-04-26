const BaseScraper = require('./base');

class WooCommerceScraper extends BaseScraper {
    async scrape(url) {
        this.logger.info(`WooCommerce specific scraping: ${url}`);
        
        // WooCommerce often has a /wp-json/wc/v3/products but requires API keys.
        // Publicly, some stores have /shop/ or just the main page.
        // We'll try to find common WC patterns.
        
        await this.page.goto(url);
        await this.page.waitForTimeout(3000);
        
        return await this.extractProducts();
    }

    async extractProducts() {
        return await this.page.evaluate(() => {
            const products = [];
            // Common WooCommerce selectors
            const items = document.querySelectorAll('li.product, .woocommerce-loop-product');
            
            items.forEach(item => {
                const name = item.querySelector('.woocommerce-loop-product__title, h2')?.innerText;
                const priceStr = item.querySelector('.price .amount')?.innerText;
                const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.]/g, '')) : 0;
                
                if (name) {
                    products.push({
                        name: name.trim(),
                        sku: 'N/A',
                        price: price,
                        inventory: 0
                    });
                }
            });
            
            return products;
        });
    }
}

module.exports = WooCommerceScraper;
