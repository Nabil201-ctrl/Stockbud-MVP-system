import { useEffect, useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

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

    // Simulate backend handshake calls for verification
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

const PolarisTimeline = ({ currentStep }) => {
  const steps = [
    { title: "Initiating Handshake", description: "Secure connection check" },
    { title: "Verifying Credentials", description: "Validating permissions" },
    { title: "Syncing Product Catalog", description: "Fetching inventory data" },
    { title: "Analyzing Data", description: "Processing historical sales" },
    { title: "Active", description: "System ready" }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;
        const isPending = currentStep < stepNum;

        let color = '#E4E5E7'; // Gray
        if (isActive) color = '#2563EB'; // Blue
        if (isCompleted) color = '#12B76A'; // Green

        return (
          <div key={index} style={{ display: 'flex', marginBottom: '24px', opacity: isPending ? 0.5 : 1, transition: 'opacity 0.5s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '16px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isCompleted ? '#E4FCE3' : (isActive ? '#EFF6FF' : '#F1F2F4'),
                border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s',
                color: isCompleted ? '#12B76A' : (isActive ? '#2563EB' : '#6D7175'), fontWeight: 'bold'
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>
              {index < steps.length - 1 && (
                <div style={{ width: '2px', height: '100%', backgroundColor: isCompleted ? '#12B76A' : '#E4E5E7', minHeight: '20px', marginTop: '8px', transition: 'all 0.5s' }} />
              )}
            </div>
            <div style={{ paddingTop: '4px' }}>
              <Text variant="bodyLg" as="p" fontWeight={isActive ? "bold" : "regular"}>{step.title}</Text>
              <Text variant="bodySm" as="p" tone="subdued">{step.description}</Text>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Index() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const [currentStep, setCurrentStep] = useState(0);
  const openApp = () => window.open("http://localhost:5173", "_blank");

  // Trigger Sync Animation
  useEffect(() => {
    if (fetcher.state === 'idle' && !fetcher.data) {
      // Start flow
      setCurrentStep(1);
      setTimeout(() => setCurrentStep(2), 1500);

      // Trigger actual backend call during step 2
      fetcher.submit({}, { method: "POST" });
    }
  }, []);

  useEffect(() => {
    if (currentStep >= 2) {
      if (fetcher.data?.status === 'success') {
        // Continue animation if success
        if (currentStep === 2) setTimeout(() => setCurrentStep(3), 1000); // Syncing
        if (currentStep === 3) setTimeout(() => setCurrentStep(4), 2500); // Analyzing
        if (currentStep === 4) setTimeout(() => setCurrentStep(5), 2000); // Done
      }
    }
  }, [currentStep, fetcher.data]);

  return (
    <Page title="Connection Status">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Box padding="400">
                <Text variant="headingLg" as="h2" alignment="center">Connecting to Stockbud AI</Text>
                <Box paddingBlockStart="200">
                  <Text variant="bodyMd" as="p" tone="subdued" alignment="center">Store: {loaderData.shop}</Text>
                </Box>
              </Box>

              <Divider />

              <Box padding="400">
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <PolarisTimeline currentStep={currentStep} />
                </div>
              </Box>

              {currentStep === 5 && (
                <Box padding="400" background="bg-surface-secondary">
                  <BlockStack gap="400" align="center">
                    <div style={{ fontSize: '48px', textAlign: 'center' }}>🎉</div>
                    <Text variant="headingMd" as="h3" alignment="center">Setup Complete!</Text>
                    <Button variant="primary" size="large" onClick={openApp}>
                      Launch Stockbud Dashboard
                    </Button>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
