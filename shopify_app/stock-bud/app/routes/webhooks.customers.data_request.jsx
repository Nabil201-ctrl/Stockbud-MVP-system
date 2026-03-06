import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`Received CUSTOMERS_DATA_REQUEST webhook for ${shop}`);
    // Payload contains customer details. If you store customer data, you should email it or provide a link to the user.
    // We do not store detailed customer info locally, so we can just return a 200.

    return new Response("OK", { status: 200 });
};
