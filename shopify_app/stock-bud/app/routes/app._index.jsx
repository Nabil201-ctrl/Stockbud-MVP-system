import { useEffect } from "react";
import { useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Link,
  List,
  Box,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session) {
    return { status: 'error', message: "No session found" };
  }

  const { shop, accessToken } = session;

  // Sync to Backend
  // NOTE: Ideally use an environment variable for the backend URL and API Key
  const backendUrl = "http://localhost:3000/shopify/connect";
  const apiKey = "shared-secret-key-123"; // Matching the backend default/assumed key

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": apiKey
      },
      body: JSON.stringify({
        shop,
        accessToken,
        // email: session?.associated_user?.email // If available
      })
    });

    if (response.ok) {
      return { status: "connected", shop };
    } else {
      console.error("Backend connect failed", await response.text());
      return { status: "sync_failed" };
    }
  } catch (error) {
    console.error("Backend connect error", error);
    return { status: "error", message: error.message };
  }
};

export const action = async ({ request }) => {
  return null;
};

export default function Index() {
  const data = useLoaderData();
  const isConnected = data?.status === 'connected';

  return (
    <Page title="Stockbud Connector">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Connection Status
                </Text>
                {isConnected ? (
                  <Banner title="Securely Connected" tone="success">
                    <p>Your shop <strong>{data.shop}</strong> is successfully connected to the Stockbud Platform.</p>
                  </Banner>
                ) : (
                  <Banner title="Connection Issue" tone="critical">
                    <p>We encountered an issue syncing your credentials. Please refresh the page.</p>
                    <p>Error: {data?.message}</p>
                  </Banner>
                )}
              </BlockStack>

              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  Your data is being securely transported to the main Stockbud dashboard for AI analysis.
                </Text>
                <InlineStack align="start">
                  <Button variant="primary" url="http://localhost:5173" target="_blank">
                    Go to Stockbud Platform
                  </Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">Why Stockbud?</Text>
            <InlineStack gap="400" align="start">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">🤖 AI-Driven Insights</Text>
                  <Text as="p">
                    Get real-time actionable advice from our advanced AI assistant, tailored to your store's performance.
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">🔒 Bank-Grade Security</Text>
                  <Text as="p">
                    Your data is encrypted in transit and at rest. We never share your sensitive information.
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">📈 Maximize Profit</Text>
                  <Text as="p">
                    Identify top-selling products, optimize inventory, and discover revenue opportunities instantly.
                  </Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
