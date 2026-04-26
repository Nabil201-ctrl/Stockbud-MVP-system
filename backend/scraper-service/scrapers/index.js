const ShopifyScraper = require('./shopify');
const WooCommerceScraper = require('./woocommerce');
const MagentoScraper = require('./magento');
const PrestaShopScraper = require('./prestashop');
const GenericAIScraper = require('./generic');

module.exports = {
    shopify: ShopifyScraper,
    woocommerce: WooCommerceScraper,
    magento: MagentoScraper,
    prestashop: PrestaShopScraper,
    generic: GenericAIScraper
};
