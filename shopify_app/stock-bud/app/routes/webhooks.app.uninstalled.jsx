import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Ensure 'completely unstalls' by removing Shopify tokens from our core Stockbud Backend
  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://localhost:3000";
    console.log(`Sending Uninstall Request to Stockbud Backend for ${shop}`);
    await fetch(`${backendUrl}/shopify/webhook/uninstall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop }),
    });
  } catch (err) {
    console.error(`Failed to notify Stockbud Backend of uninstall for ${shop}:`, err);
  }

  return new Response();
};
