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
  if (!session) return { status: "error", message: "No session found. Please reload the app." };

  const shop = session.shop;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  // --- Step 1: Try to get the existing offline (shpat_) token from session storage ---
  const offlineId = getOfflineId(shop);
  let offlineSession = await shopify.sessionStorage.loadSession(offlineId);
  let offlineToken = offlineSession?.accessToken;

  console.log(`[Stockbud] Session for ${shop}`);
  console.log(`[Stockbud] Online token prefix: ${session.accessToken?.substring(0, 8)}`);
  console.log(`[Stockbud] Offline token: ${offlineToken ? offlineToken.substring(0, 8) + "..." : "NOT FOUND"}`);

  // --- Step 2: If no shpat_ in storage, exchange the current session token for an offline one ---
  if (!offlineToken || !offlineToken.startsWith("shpat_")) {
    console.log("[Stockbud] No offline token found. Attempting token exchange via Shopify API...");

    // Use the app's credentials to get an offline access token.
    // This works by posting to the Admin OAuth token endpoint with the client credentials.
    // Since useOnlineTokens: false is set, the Shopify framework will have already
    // created an offline session during the LAST OAuth callback.
    // If it's still missing, we request a new one using the access_token endpoint:
    try {
      const tokenUrl = `https://${shop}/admin/oauth/access_token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: apiSecret,
          // We don't have a fresh code here — we rely on the framework's stored session.
          // As a fallback, use the current online session token to call the API directly.
        }),
      });

      if (!tokenResponse.ok) {
        // The direct exchange without a code won't work from here.
        // The REAL fix: since useOnlineTokens: false is now set in shopify.server.js,
        // the next time the merchant opens this app, the OAuth flow will automatically
        // produce and store a shpat_ token in session storage. We just need to signal
        // the user to do a one-time reconnect.
        console.log("[Stockbud] Cannot exchange without an auth code. Merchant needs to re-authenticate.");
        return {
          status: "needs_reauth",
          message: "Your session needs to be refreshed to get a secure offline token. Please click the button below.",
          shop,
        };
      }

      const tokenData = await tokenResponse.json();
      offlineToken = tokenData.access_token;
      console.log(`[Stockbud] Got new token with prefix: ${offlineToken?.substring(0, 8)}`);

      // Store this offline session for future use
      const { Session } = await import("@shopify/shopify-api");
      const newOfflineSession = new Session({
        id: offlineId,
        shop,
        state: session.state || "offline",
        isOnline: false,
        accessToken: offlineToken,
        scope: session.scope,
      });
      await shopify.sessionStorage.storeSession(newOfflineSession);
      console.log(`[Stockbud] Stored offline session for ${shop}`);
    } catch (exchangeError) {
      console.error("[Stockbud] Token exchange error:", exchangeError.message);
      return {
        status: "needs_reauth",
        message: "Please reload the app from your Shopify admin to refresh your session.",
        shop,
      };
    }
  }

  // --- Step 3: At this point we have a token — verify it's the right type ---
  if (!offlineToken || !offlineToken.startsWith("shpat_")) {
    console.warn(`[Stockbud] Token acquired (${offlineToken?.substring(0, 8)}) is NOT an offline shpat_ token. Re-auth required.`);
    return {
      status: "needs_reauth",
      message: `Token type mismatch: got "${offlineToken?.substring(0, 8)}..." but need "shpat_...". The app needs to be reinstalled to get the correct token type.`,
      shop,
    };
  }

  const formData = await request.formData();
  const pairingCode = formData.get("pairingCode");
  const stockbudToken = formData.get("stockbudToken");
  const name = formData.get("name");

  console.log(`[Stockbud] Syncing shop: ${shop} → using shpat_ token ✓`);

  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://localhost:3000";

    if (pairingCode) {
      // New flow: Use pairing code
      const response = await fetch(`${backendUrl}/shopify/connect-with-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pairingCode,
          shop,
          accessToken: offlineToken,          // guaranteed shpat_ here
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
      // Legacy flow
      const response = await fetch(`${backendUrl}/shopify/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${stockbudToken}`,
        },
        body: JSON.stringify({ shop, accessToken: offlineToken, name }),
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
    { title: "Handshake", description: "Secure check" },
    { title: "Credentials", description: "Validating" },
    { title: "Catalog", description: "Fetching" },
    { title: "Analysis", description: "Processing" },
    { title: "Active", description: "Ready" }
  ];

  return (
    <div style={{ padding: '20px 0', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        {/* Continuous Line Background */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '0',
          right: '0',
          height: '2px',
          backgroundColor: '#E4E5E7',
          zIndex: 0
        }} />

        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;

          // Calculate progress for the colored line
          // This is a bit tricky in a mapped flex container, so we'll use individual lines or just color dots.
          // Simpler approach: The background line is gray. We can add a colored line on top if needed, 
          // but for now let's just make the dots pop.

          let color = '#E4E5E7'; // Gray
          if (isActive) color = '#2563EB'; // Blue
          if (isCompleted) color = '#12B76A'; // Green

          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: isCompleted ? '#E4FCE3' : (isActive ? '#EFF6FF' : '#F1F2F4'),
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.5s',
                color: isCompleted ? '#12B76A' : (isActive ? '#2563EB' : '#6D7175'),
                fontWeight: 'bold',
                marginBottom: '12px'
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>

              <div style={{ textAlign: 'center' }}>
                <Text variant="bodyMd" as="p" fontWeight={isActive ? "bold" : "regular"}>{step.title}</Text>
                <Text variant="caption" as="p" tone="subdued">{step.description}</Text>
              </div>
            </div>
          )
        })}
      </div>
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
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthMessage, setReauthMessage] = useState("");

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

    // Handle needs_reauth — offline shpat_ token not available yet
    if (fetcher.data?.status === 'needs_reauth') {
      setNeedsReauth(true);
      setReauthMessage(fetcher.data.message || "Please re-authenticate to get a secure token.");
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
                {needsReauth ? (
                  <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                    <BlockStack gap="500">
                      <Banner
                        tone="warning"
                        title="Session refresh required"
                      >
                        <p>{reauthMessage}</p>
                        <p style={{ marginTop: '8px', fontSize: '13px', color: '#6d7175' }}>
                          This is a one-time step. After re-authenticating, your store will connect automatically.
                        </p>
                      </Banner>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => {
                          // MUST break out of the Shopify Admin iframe before OAuth redirect.
                          // accounts.shopify.com has X-Frame-Options: DENY — it refuses
                          // to load inside any iframe. window.top escapes to the top frame.
                          const authUrl = `/auth?shop=${loaderData.shop}`;
                          if (window.top) {
                            window.top.location.href = authUrl;
                          } else {
                            window.location.href = authUrl;
                          }
                        }}
                      >
                        🔐 Re-authenticate with Shopify
                      </Button>
                      <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                        This will redirect you through a quick Shopify login to get your secure offline token.
                      </Text>
                    </BlockStack>
                  </div>
                ) : !token ? (
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
