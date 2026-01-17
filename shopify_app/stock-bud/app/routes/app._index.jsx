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
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session?.shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (!session) return { status: "error", message: "No session" };

  const formData = await request.formData();
  const stockbudToken = formData.get("stockbudToken");
  const name = formData.get("name");

  console.log("Syncing with Stockbud Backend...", session.shop);
  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://localhost:3000";

    // Call backend with Bearer token
    const headers = {
      "Content-Type": "application/json",
    };
    if (stockbudToken) {
      headers["Authorization"] = `Bearer ${stockbudToken}`;
    }

    // Simulate backend handshake calls for verification
    const response = await fetch(`${backendUrl}/shopify/connect`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        shop: session.shop,
        accessToken: session.accessToken,
        name: name,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { status: "success", userId: data.userId };
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
      const backendUrl = "http://localhost:3000"; // Assuming standard proxy or handling
      const response = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }), // NestJS Local Strategy typically uses 'username'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          setToken(data.access_token);
        } else {
          setLoginError("Login failed: No access token received");
        }
      } else {
        setLoginError("Invalid credentials");
      }
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

  // Trigger Sync Animation once logged in (or automatically if we want)
  useEffect(() => {
    if (token && fetcher.state === 'idle' && !fetcher.data && currentStep === 0) {
      // Start flow only when token is present
      setCurrentStep(1);
      setTimeout(() => setCurrentStep(2), 1500);

      // Trigger actual backend call during step 2
      const formData = new FormData();
      formData.append("stockbudToken", token);
      formData.append("name", name);
      fetcher.submit(formData, { method: "POST" });
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
                        Please login to your Stockbud account to link this store.
                      </Text>
                      {loginError && (
                        <Banner tone="critical">
                          <p>{loginError}</p>
                        </Banner>
                      )}
                      <FormLayout>
                        <TextField
                          label="Email"
                          value={email}
                          onChange={setEmail}
                          autoComplete="email"
                          type="email"
                        />
                        <TextField
                          label="Password"
                          value={password}
                          onChange={setPassword}
                          autoComplete="current-password"
                          type="password"
                        />
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={handleLogin}
                          loading={isLoading}
                          disabled={!email || !password}
                        >
                          Login & Connect
                        </Button>
                      </FormLayout>
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
