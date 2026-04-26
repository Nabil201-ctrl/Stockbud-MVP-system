const BaseScraper = require('./base');

class PrestaShopScraper extends BaseScraper {
    async scrape(url) {
        this.logger.info(`PrestaShop specific scraping: ${url}`);
        await this.page.goto(url);
        await this.page.waitForTimeout(3000);
        return await this.extractProducts();
    }

    async extractProducts() {
        return await this.page.evaluate(() => {
            const products = [];
            // Common PrestaShop 1.7+ selectors
            const items = document.querySelectorAll('.product-miniature, .product-item');
            
            items.forEach(item => {
                const name = item.querySelector('.product-title a, .h3.product-title a')?.innerText;
                const priceStr = item.querySelector('.price, .product-price-and-shipping .price')?.innerText;
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

module.exports = PrestaShopScraper;
