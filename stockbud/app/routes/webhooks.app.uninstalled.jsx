import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);



  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }


  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "https://api.stockbud.xyz";
    console.log(`Sending Uninstall Request to Stockbud Backend for ${shop}`);
    await fetch(`${backendUrl}/shopify/webhook/uninstall`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": process.env.INTERNAL_API_KEY
      },
      body: JSON.stringify({ shop }),
    });
  } catch (err) {
    console.error(`Failed to notify Stockbud Backend of uninstall for ${shop}:`, err);
  }

  return new Response();
};
