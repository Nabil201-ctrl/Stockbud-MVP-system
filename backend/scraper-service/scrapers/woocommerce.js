const BaseScraper = require('./base');

class WooCommerceScraper extends BaseScraper {
    async scrape(url) {
        this.logger.info(`WooCommerce specific scraping: ${url}`);
        
        
        
        await this.page.goto(url);
        await this.page.waitForTimeout(3000);
        
        return await this.extractProducts();
    }

    async extractProducts() {
        return await this.page.evaluate(() => {
            const products = [];
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
