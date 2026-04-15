# Shopify Integration

Stockbud provides a seamless integration with Shopify, allowing you to sync your entire catalog and manage orders directly from our platform.

## Connecting a Store

To test the integration, you can use our manual pairing method or the seamless auto-connect.

### Manual Pairing (Recommended for Reviewers)

1. **Log in** to the [Stockbud Platform](https://app.stockbud.xyz).
2. Go to **Settings > Stores**.
3. Use the master pairing code: `STOCK-BUD-REVIEW`.
4. Open the Stockbud app in your Shopify Development Store.
5. In the "OR MANUALLY PAIR" section, paste the code and click **Pair Manual Account**.

### Auto-Connect

Click the **"Connect Store Now"** button in the Shopify app dashboard. The system will automatically link your test store to your Stockbud account based on your verified email.

## Real-time Sync

Once connected, Stockbud listens for:
- `products/create`
- `orders/paid`
- `app/uninstalled`

This ensures your inventory is always accurate, regardless of which platform you're using.
