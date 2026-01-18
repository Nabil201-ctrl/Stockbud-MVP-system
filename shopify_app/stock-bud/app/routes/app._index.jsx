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
  TextField,
  FormLayout,
  Banner,
} from "@shopify/polaris";
import shopify, { authenticate, getOfflineId } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session?.shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (!session) return { status: "error", message: "No session" };

  // Fetch Offline Session for Background Jobs
  const offlineId = getOfflineId(session.shop);
  const offlineSession = await shopify.sessionStorage.loadSession(offlineId);
  const offlineToken = offlineSession?.accessToken;

  const formData = await request.formData();
  const pairingCode = formData.get("pairingCode");
  const stockbudToken = formData.get("stockbudToken");
  const name = formData.get("name");

  console.log("Syncing with Stockbud Backend...", session.shop);
  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://localhost:3000";

    // Determine which endpoint to call based on what we have
    if (pairingCode) {
      // New flow: Use pairing code
      const response = await fetch(`${backendUrl}/shopify/connect-with-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pairingCode,
          shop: session.shop,
          accessToken: offlineToken || session.accessToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { status: "success", userId: data.userId, usedCode: true };
      } else {
        const errorText = await response.text();
        return { status: "error", message: errorText || "Invalid pairing code" };
      }
    } else if (stockbudToken) {
      // Legacy flow: Use Bearer token (for backward compatibility if needed)
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${stockbudToken}`,
      };

      const response = await fetch(`${backendUrl}/shopify/connect`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          shop: session.shop,
          accessToken: offlineToken || session.accessToken,
          name: name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { status: "success", userId: data.userId };
      } else {
        return { status: "error", message: await response.text() };
      }
    } else {
      return { status: "error", message: "No pairing code or token provided" };
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

  // Login State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const openApp = () => window.open("http://localhost:5173", "_blank");

  const handleLogin = async () => {
    setIsLoading(true);
    setLoginError("");
    try {


      // Get the offline token from the session (from loader)
      // Note: We can't access offlineSession here in the component.
      // We'll send the code and let the action handle token retrieval.

      // For now, we'll use a form submission approach
      // The code is in 'email' state (reused variable)
      const formData = new FormData();
      formData.append("pairingCode", email); // email state holds the pairing code
      fetcher.submit(formData, { method: "POST" });

      // Token will be set after fetcher completes successfully
      // We'll check for a special response to signal success
    } catch (err) {
      setLoginError("Connection error: " + err.message);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = "http://localhost:3000";
    // Center popup
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      `${backendUrl}/auth/google`,
      "stockbud_login",
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const listener = (event) => {
      if (event.data?.type === "STOCKBUD_AUTH_SUCCESS" && event.data.token) {
        setToken(event.data.token);
        window.removeEventListener("message", listener);
      }
    };
    window.addEventListener("message", listener);
  };

  // Trigger Sync Animation once code is validated or token is received
  useEffect(() => {
    // Check if fetcher returned success for pairing code flow
    if (fetcher.data?.status === 'success' && fetcher.data?.usedCode && !token && currentStep === 0) {
      // Pairing code was valid, start the animation
      setToken('paired'); // Set token to trigger UI change
      setIsLoading(false);
      setCurrentStep(1);
      setTimeout(() => setCurrentStep(2), 1500);
    } else if (token && fetcher.state === 'idle' && !fetcher.data && currentStep === 0) {
      // Legacy Bearer token flow
      setCurrentStep(1);
      setTimeout(() => setCurrentStep(2), 1500);

      const formData = new FormData();
      formData.append("stockbudToken", token);
      formData.append("name", name);
      fetcher.submit(formData, { method: "POST" });
    }

    // Handle error from pairing code
    if (fetcher.data?.status === 'error' && fetcher.data?.message) {
      setLoginError(fetcher.data.message);
      setIsLoading(false);
    }
  }, [token, fetcher.state, fetcher.data, currentStep]);

  useEffect(() => {
    if (currentStep >= 2) {
      if (fetcher.data?.status === 'success') {
        // Continue animation if success
        if (currentStep === 2) setTimeout(() => setCurrentStep(3), 1000); // Syncing
        if (currentStep === 3) setTimeout(() => setCurrentStep(4), 2500); // Analyzing
        if (currentStep === 4) setTimeout(() => setCurrentStep(5), 2000); // Done
      } else if (fetcher.data?.status === 'error') {
        // Handle error visualization if needed, currently just stops
        console.error("Sync Error:", fetcher.data.message);
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
                {!token ? (
                  <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <BlockStack gap="400">
                      <Text variant="bodyMd" as="p" alignment="center">
                        Enter the pairing code from your Stockbud account to link this store.
                      </Text>
                      {loginError && (
                        <Banner tone="critical">
                          <p>{loginError}</p>
                        </Banner>
                      )}
                      <FormLayout>
                        <TextField
                          label="Pairing Code"
                          value={email}
                          onChange={setEmail}
                          placeholder="ABC-123-XYZ"
                          autoComplete="off"
                        />
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={handleLogin}
                          loading={isLoading || fetcher.state === 'submitting'}
                        >
                          Connect Store
                        </Button>
                      </FormLayout>
                      <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                        Get your code from the Stockbud settings page.
                      </Text>
                    </BlockStack>
                  </div>
                ) : (
                  <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <PolarisTimeline currentStep={currentStep} />
                  </div>
                )}
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
