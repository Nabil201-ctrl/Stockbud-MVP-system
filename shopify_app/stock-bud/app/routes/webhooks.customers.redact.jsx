import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`Received CUSTOMERS_REDACT webhook for ${shop}`);
    
    

    return new Response("OK", { status: 200 });
};
