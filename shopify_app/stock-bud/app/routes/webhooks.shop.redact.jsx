import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`Received SHOP_REDACT webhook for ${shop}`);

    
    try {
        await db.session.deleteMany({ where: { shop } });
    } catch (e) {
        console.error(`Failed to clear session DB during SHOP_REDACT for ${shop}:`, e);
    }

    
    try {
        const backendUrl = process.env.STOCKBUD_BACKEND_URL || "https://api.stockbud.xyz";
        await fetch(`${backendUrl}/shopify/webhook/uninstall`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop }),
        });
    } catch (err) {
        console.error(`Failed to notify Stockbud Backend of shop redact for ${shop}:`, err);
    }

    return new Response("OK", { status: 200 });
};
