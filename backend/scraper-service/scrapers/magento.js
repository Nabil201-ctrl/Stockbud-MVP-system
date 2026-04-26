const BaseScraper = require('./base');

class MagentoScraper extends BaseScraper {
    async scrape(url) {
        this.logger.info(`Magento specific scraping: ${url}`);
        await this.page.goto(url);
        await this.page.waitForTimeout(3000);
        return await this.extractProducts();
    }

    async extractProducts() {
        return await this.page.evaluate(() => {
            const products = [];
            // Common Magento 2 selectors
            const items = document.querySelectorAll('.product-item, .item.product.product-item');
            
            items.forEach(item => {
                const name = item.querySelector('.product-item-link, .product-name a')?.innerText;
                const priceStr = item.querySelector('.price-wrapper .price, .price-box .price')?.innerText;
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

module.exports = MagentoScraper;
