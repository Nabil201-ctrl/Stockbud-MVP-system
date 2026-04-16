import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[GDPR] Received CUSTOMERS_DATA_REQUEST for ${shop}`);

    try {
        const backendUrl = process.env.STOCKBUD_BACKEND_URL || "https://api.stockbud.xyz";
        await fetch(`${backendUrl}/shopify/webhook/data-request`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY
            },
            body: JSON.stringify({ shop_domain: shop, ...payload }),
        });
    } catch (err) {
        console.error(`[GDPR] Failed to notify backend of data request for ${shop}:`, err);
    }

    return new Response("OK", { status: 200 });
};
