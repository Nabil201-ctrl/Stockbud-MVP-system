import { useEffect, useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
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
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// loader: Only check session and maybe do a quick ping if desired (omitted for speed)
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session?.shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (!session) return { status: "error", message: "No session" };

  console.log("Syncing with Stockbud Backend...", session.shop);
  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;

    const response = await fetch(`${backendUrl}/shopify/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": apiKey,
      },
      body: JSON.stringify({
        shop: session.shop,
        accessToken: session.accessToken,
      }),
    });

    if (response.ok) {
      return { status: "success" };
    } else {
      return { status: "error", message: await response.text() };
    }
  } catch (error) {
    return { status: "error", message: error.message };
  }
};

export default function Index() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const [step, setStep] = useState(1); // 1: Init, 2: Syncing, 3: Done
  const openApp = () => window.open("http://localhost:5173", "_blank");

  // Trigger sync on mount
  useEffect(() => {
    if (fetcher.state === 'idle' && !fetcher.data) {
      setStep(2);
      fetcher.submit({}, { method: "POST" });
    }
  }, []);

  useEffect(() => {
    if (fetcher.data?.status === 'success') {
      // Small delay for visual effect so user sees the "Syncing" step
      setTimeout(() => setStep(3), 800);
    } else if (fetcher.data?.status === 'error') {
      setStep(-1); // Error state
    }
  }, [fetcher.data]);

  return (
    <Page title="StockBud Connection">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500" align="center">

              <Box paddingBlock="500">
                <BlockStack gap="400" align="center">

                  {/* Step 1 & 2: Loading State */}
                  {step < 3 && step !== -1 && (
                    <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spinner size="large" accessibilityLabel="Connecting" />
                    </div>
                  )}

                  {/* Step 3: Success State */}
                  {step === 3 && (
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#E4FCE3',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="#12B76A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}

                  {/* Error State */}
                  {step === -1 && (
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#FEE2E2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '40px' }}>⚠️</span>
                    </div>
                  )}

                  <BlockStack gap="100" align="center">
                    <Text as="h2" variant="headingLg">
                      {step === 1 && "Initializing..."}
                      {step === 2 && "Syncing with StockBud AI..."}
                      {step === 3 && "System Connected"}
                      {step === -1 && "Connection Failed"}
                    </Text>
                    <Text as="p" tone="subdued">
                      {step === 3 ? (
                        <>Your store <b>{loaderData.shop}</b> is successfully synced.</>
                      ) : (
                        step === -1 ? "Please check your API Key configuration." : "Establishing secure connection..."
                      )}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Box>

              <Divider />

              {/* Call to Action - Only show when connected */}
              <Box paddingBlock="400" style={{ opacity: step === 3 ? 1 : 0.5, pointerEvents: step === 3 ? 'auto' : 'none' }}>
                <BlockStack gap="300" align="center">
                  <Text as="p" variant="bodyMd" alignment="center">
                    Manage your inventory, view AI insights, and chat with your assistant on the main dashboard.
                  </Text>
                  <Button variant="primary" size="large" onClick={openApp} disabled={step !== 3}>
                    Go to StockBud Dashboard
                  </Button>
                </BlockStack>
              </Box>

            </BlockStack>
          </Card>
        </Layout.Section>
        {/* Footer info remains same */}
        <Layout.Section>
          <Box paddingBlockStart="800">
            <Text as="p" variant="caption" tone="subdued" alignment="center">
              StockBud is running in the background. You can close this tab.
            </Text>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
