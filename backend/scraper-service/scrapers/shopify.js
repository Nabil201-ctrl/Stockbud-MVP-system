const BaseScraper = require('./base');

class ShopifyScraper extends BaseScraper {
    async scrape(url) {
        this.logger.info(`Shopify specific scraping: ${url}`);
        
        // Shopify sites usually have a /products.json endpoint which is easier than HTML
        const productsUrl = url.endsWith('/') ? `${url}products.json` : `${url}/products.json`;
        
        try {
            this.logger.info(`Trying to fetch products from JSON endpoint: ${productsUrl}`);
            await this.page.goto(productsUrl);
            const content = await this.page.innerText('body');
            const data = JSON.parse(content);
            
            if (data.products) {
                return data.products.map(p => ({
                    name: p.title,
                    sku: p.variants[0]?.sku || p.id.toString(),
                    price: parseFloat(p.variants[0]?.price || 0),
                    inventory: p.variants.reduce((acc, v) => acc + (v.inventory_quantity || 0), 0)
                }));
            }
        } catch (err) {
            this.logger.warn(`JSON endpoint failed, falling back to HTML scraping: ${err.message}`);
        }

        // Fallback to HTML scraping with specific selectors
        await this.page.goto(url);
        return await this.extractProducts();
    }

    async extractProducts() {
        // Common Shopify theme selectors
        return await this.page.evaluate(() => {
            const products = [];
            const items = document.querySelectorAll('.product-card, .grid-view-item, .product-item');
            
            items.forEach(item => {
                const name = item.querySelector('.product-card__title, .grid-view-item__title')?.innerText;
                const priceStr = item.querySelector('.price-item--regular, .product-card__price')?.innerText;
                const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.]/g, '')) : 0;
                
                if (name) {
                    products.push({
                        name: name.trim(),
                        sku: 'N/A', // Hard to get SKU from frontend grid
                        price: price,
                        inventory: 0 // Usually not visible on frontend
                    });
                }
            });
            
            return products;
        });
    }
}

module.exports = ShopifyScraper;
