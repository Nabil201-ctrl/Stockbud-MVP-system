import { useEffect } from "react";
import { useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineGrid,
  Link,
  List,
  Box,
  Banner,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  if (!session) {
    return { status: 'error', message: "No session found" };
  }

  const { shop, accessToken } = session;

  // 1. Sync to Backend (Keep existing logic)
  const backendUrl = "http://localhost:3000/shopify/connect";
  const apiKey = "shared-secret-key-123";
  let connectionStatus = "connected";
  let connectionMessage = "";

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
      })
    });

    if (!response.ok) {
      console.error("Backend connect failed", await response.text());
      connectionStatus = "sync_failed";
      connectionMessage = "Could not sync credentials to AI backend.";
    }
  } catch (error) {
    console.error("Backend connect error", error);
    connectionStatus = "error";
    connectionMessage = error.message;
  }

  // 2. Fetch Real Shopify Data (Last 7 Days)
  // Query orders to calculate simple metrics
  let shopifyStats = {
    orderCount: 0,
    totalSales: "0.00",
    currency: "USD"
  };

  try {
    const response = await admin.graphql(
      `#graphql
      query getRecentOrders {
        orders(first: 50, reverse: true) {
          edges {
            node {
              id
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              createdAt
            }
          }
        }
        shop {
          currencyCode
        }
      }`
    );

    const result = await response.json();

    if (result.data && result.data.orders) {
      const orders = result.data.orders.edges;
      shopifyStats.orderCount = orders.length; // Just counting last 50 for MVP speed
      shopifyStats.currency = result.data.shop.currencyCode;

      const total = orders.reduce((acc, edge) => {
        return acc + parseFloat(edge.node.totalPriceSet?.shopMoney?.amount || 0);
      }, 0);

      shopifyStats.totalSales = total.toFixed(2);
    }
  } catch (err) {
    console.error("Failed to fetch shopify stats", err);
  }

  return { status: connectionStatus, message: connectionMessage, shop, shopifyStats };
};

export const action = async ({ request }) => {
  return null;
};

export default function Index() {
  const data = useLoaderData();
  const isConnected = data?.status === 'connected';

  // Helper to open main app
  const openApp = () => window.open("http://localhost:5173", "_blank");

  return (
    <Page title="StockBud Dashboard" primaryAction={{ content: 'Open Full App', onAction: openApp }}>
      <Layout>

        {/* Connection Status Banner */}
        <Layout.Section>
          {!isConnected && (
            <Banner title="Connection Issue" tone="critical">
              <p>We encountered an issue syncing your credentials: {data?.message}</p>
              <p>Some AI features may be unavailable.</p>
            </Banner>
          )}
          {isConnected && (
            <Banner title="AI System Active" tone="success" onDismiss={() => { }}>
              <p>Your store data is properly synced with StockBud AI. You can now use the full analysis platform.</p>
            </Banner>
          )}
        </Layout.Section>

        {/* Quick Stats Grid */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">Recent Orders (Last 50)</Text>
                <Text as="h2" variant="headingLg">{data.shopifyStats?.orderCount || 0}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">Recent Revenue</Text>
                <Text as="h2" variant="headingLg">
                  {data.shopifyStats?.totalSales || "0.00"} {data.shopifyStats?.currency}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">AI Status</Text>
                <Text as="h2" variant="headingLg" tone={isConnected ? "success" : "critical"}>
                  {isConnected ? "Online" : "Offline"}
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        {/* Call to Action */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">🚀 Take your insights to the next level</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  The embedded dashboard gives you a quick snapshot. Unlock deep inventory analytics,
                  predictive forecasting, and the "Ask StockBud" chat assistant in the full platform.
                </Text>
              </BlockStack>
              <InlineGrid columns="auto auto" gap="200">
                <Button variant="primary" onClick={openApp}>
                  Launch Full Platform
                </Button>
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Footer info */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <Text as="p" variant="caption" tone="subdued" alignment="center">
              StockBud MVP System &bull; Built for Shopify
            </Text>
          </Box>
        </Layout.Section>

      </Layout>
    </Page>
  );
}
