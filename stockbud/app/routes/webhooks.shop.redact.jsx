import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[GDPR] Received SHOP_REDACT for ${shop}`);

    // 1. Clear sessions from local SQLite
    try {
        await db.session.deleteMany({ where: { shop } });
        console.log(`[GDPR] Cleared local sessions for ${shop}`);
    } catch (e) {
        console.error(`[GDPR] Failed to clear local session DB for ${shop}:`, e);
    }

    // 2. Notify Backend to redact store data
    try {
        const backendUrl = process.env.STOCKBUD_BACKEND_URL || "https://api.stockbud.xyz";
        await fetch(`${backendUrl}/shopify/webhook/redact-shop`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY
            },
            body: JSON.stringify({ shop_domain: shop }),
        });
    } catch (err) {
        console.error(`[GDPR] Failed to notify backend of shop redact for ${shop}:`, err);
    }

    return new Response("OK", { status: 200 });
};
