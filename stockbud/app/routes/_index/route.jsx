import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Maximize Your Store's Potential with Stockbud</h1>
        <p className={styles.text}>
          Smart inventory management and unified store analytics, driven by AI.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="my-shop-domain.myshopify.com"
              />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Unified Cross-Store Sync</strong>. Keep your inventory perfectly synchronized across all your Shopify and social storefronts in real-time.
          </li>
          <li>
            <strong>AI-Powered Stock Insights</strong>. Get intelligent recommendations and detailed reports to optimize your order processing and reduce stockouts.
          </li>
          <li>
            <strong>Centralized Order Management</strong>. Manage orders from Shopify, WhatsApp, and Instagram in a single, streamlined dashboard.
          </li>
        </ul>
      </div>
    </div>
  );
}
