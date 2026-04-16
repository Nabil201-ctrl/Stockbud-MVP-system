# Shopify App Review Guide - Stockbud

This document outlines the steps for Shopify reviewers to test the integration between the **Stockbud App** and the **Stockbud Intelligence Platform**.

## 1. Credentials for External Platform

To test the full functionality, please use the following pre-configured test account on our external platform.

- **Platform URL:** [https://stockbud.xyz](https://stockbud.xyz)
- **Reviewer Pairing Code:** `STOCK-BUD-REVIEW`
- **Reviewer Email:** `tester@stockbud.xyz`
- **Password:** `Stockbud2026!`

## 2. Step-by-Step Connection Instructions (Manual Pairing)

We recommend using the **Manual Pairing** method to link the Shopify store to the test account provided above.

1. **Access the Platform:** Log in to the [Stockbud Intelligence Platform](https://stockbud.xyz) using the credentials provided.
2. **Generate Code:** Navigate to **Settings** (Sidebar) > **Stores** tab.
3. **Pairing Code:** You can use the master review code: `STOCK-BUD-REVIEW`. (Alternatively, click "Pair Code" in the dashboard to generate a temporary one).
4. **Open Shopify App:** In your Shopify Development Store, open the **Stockbud** app.
5. **Initiate Pairing:** On the onboarding screen, locate the **"OR MANUALLY PAIR"** section at the bottom.
6. **Enter Code:** Copy the code from the Stockbud Platform and paste it into the **"Enter Pairing Code"** field in the Shopify app.
7. **Complete Sync:** Click **"Pair Manual Account"**. You will see a timeline showing the handshake, credential verification, and catalog syncing.
8. **Dashboard Access:** Once complete (approx. 10-15 seconds), the **Retail Intelligence Dashboard** will load, displaying store metrics.

## 3. Alternative: Seamless Auto-Connection

If you prefer not to use a pre-existing account, you can use the **Auto-Connect** feature:
1. Open the Stockbud app in Shopify.
2. Ensure the email address in the "Confirmed Account Email" field is accurate.
3. Click **"Connect Store Now"**. 
4. The system will automatically create a Stockbud account for you and link it to the store.

## 4. Handling Data Requirement

The test account `tester@stockbud.xyz` comes pre-populated with dummy "Social Store" data (WhatsApp/Instagram orders) to ensure you do not see an empty state. Once the Shopify store is linked, Shopify orders and products will be merged into the unified analytics view.

## 5. Bypass / Developer Backdoor

If the pairing flow is interrupted, you can bypass the onboarding by setting the following environment variable (for local testing) or hardcoding a check for `myshopify.com` domains in the `app._index.jsx` loader:
- The `myshopify.com` domain is used as a bypass key in the backend logic for approved review stores.

---
**Pro-Tip:** If you experience any issues with the hand-shake, please ensure that your firewall allows traffic from common VPN/Data Center IPs frequently used by Shopify reviewers.
