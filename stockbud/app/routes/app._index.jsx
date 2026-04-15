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
  Grid,
  Icon,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import {
  ChartLineIcon,
  OrderIcon,
  ProductIcon,
  PaymentIcon,
  CheckIcon,
  AlertBubbleIcon,
} from "@shopify/polaris-icons";
import shopify, { authenticate, getOfflineId } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://127.0.0.1:3000";

  // Fetch shop details for seamless onboarding
  const response = await admin.graphql(
    `#graphql
    query getShop {
      shop {
        name
        email
        contactEmail
        myshopifyDomain
      }
    }`
  );

  const resData = await response.json();
  const shop = resData?.data?.shop;

  // Check if this shop is already connected to Stockbud
  let isConnected = false;
  let userData = null;
  let stats = null;

  try {
    const statusResponse = await fetch(`${backendUrl}/shopify/status?shop=${session.shop}`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      isConnected = statusData.isConnected;
      userData = statusData.user;

      if (isConnected && userData?.id) {
        // Fetch stats if connected
        const statsResponse = await fetch(`${backendUrl}/dashboard/stats?userId=${userData.id}&range=month&sourceFilter=shopify`);
        if (statsResponse.ok) {
          stats = await statsResponse.json();
        }
      }
    }
  } catch (e) {
    console.warn("Failed to check connection status", e.message);
  }

  return {
    shop: session?.shop,
    shopDetails: shop,
    isConnected,
    userData,
    stats,
    backendUrl
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (!session) return { status: "error", message: "No session" };

  const offlineId = getOfflineId(session.shop);
  const offlineSession = await shopify.sessionStorage.loadSession(offlineId);
  const offlineToken = offlineSession?.accessToken;

  const formData = await request.formData();
  const intent = formData.get("intent");
  const pairingCode = formData.get("pairingCode");
  const name = formData.get("name");
  const email = formData.get("email");

  try {
    const backendUrl = process.env.STOCKBUD_BACKEND_URL || "http://127.0.0.1:3000";

    if (intent === "AUTO_CONNECT") {
      const response = await fetch(`${backendUrl}/shopify/auto-connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: session.shop,
          accessToken: offlineToken || session.accessToken,
          name: name,
          email: email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { status: "success", userId: data.userId, auto: true, action: data.action };
      } else {
        return { status: "error", message: "Auto-connection failed. Please try manual pairing." };
      }
    }

    if (pairingCode) {
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
    }

    return { status: "error", message: "Invalid request" };
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

        let color = '#E4E5E7';
        if (isActive) color = '#2563EB';
        if (isCompleted) color = '#12B76A';

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

const DashboardUI = ({ stats, shop }) => {
  const revenue = stats?.revenue?.total || 0;
  const change = stats?.revenue?.change || 0;
  const inventoryValue = stats?.inventoryValue || 0;
  const recentOrders = stats?.salesHistory || [];

  return (
    <BlockStack gap="500">
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text variant="headingSm" as="h6" tone="subdued">Total Revenue</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <Text variant="headingLg" as="p">${revenue.toLocaleString()}</Text>
                  <Badge tone={change >= 0 ? "success" : "critical"}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Icon source={ChartLineIcon} />
                      {change >= 0 ? '+' : ''}{change}%
                    </div>
                  </Badge>
                </div>
              </BlockStack>
            </Box>
          </Card>
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text variant="headingSm" as="h6" tone="subdued">Inventory Value</Text>
                <Text variant="headingLg" as="p">${inventoryValue.toLocaleString()}</Text>
              </BlockStack>
            </Box>
          </Card>
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text variant="headingSm" as="h6" tone="subdued">Sync Status</Text>
                <Badge tone="success">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon source={CheckIcon} />
                    Active
                  </div>
                </Badge>
              </BlockStack>
            </Box>
          </Card>
        </Grid.Cell>
      </Grid>

      <Layout>
        <Layout.Section>
          <Card padding="0">
            <Box padding="400">
              <Text variant="headingMd" as="h2">Recent Orders</Text>
            </Box>
            <Divider />
            {recentOrders.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f1f1' }}>
                      <th style={{ padding: '12px 16px' }}>Order</th>
                      <th style={{ padding: '12px 16px' }}>Customer</th>
                      <th style={{ padding: '12px 16px' }}>Total</th>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <Text variant="bodyMd" fontWeight="bold">#{order.id.toString().substring(0, 5)}</Text>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{order.name}</td>
                        <td style={{ padding: '12px 16px' }}>${order.amount}</td>
                        <td style={{ padding: '12px 16px' }}>{new Date(order.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Box padding="1000">
                <EmptyState
                  heading="No orders yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>When you start making sales, they will show up here.</p>
                </EmptyState>
              </Box>
            )}
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">AI Insights</Text>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <BlockStack gap="200">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon source={AlertBubbleIcon} tone="info" />
                      <Text variant="bodyMd" fontWeight="bold">Store Health</Text>
                    </div>
                    <Text variant="bodySm">Your inventory-to-sales ratio is healthy. Consider restocking top products soon.</Text>
                  </BlockStack>
                </div>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </BlockStack>
  );
};

export default function Index() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const [currentStep, setCurrentStep] = useState(loaderData.isConnected ? 5 : 0);
  const [pairingCode, setPairingCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [token, setToken] = useState(loaderData.isConnected ? 'paired' : null);
  const [email, setEmail] = useState(loaderData.shopDetails?.email || loaderData.shopDetails?.contactEmail || "");
  const [verificationSent, setVerificationSent] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setLoginError("");
    const formData = new FormData();
    formData.append("pairingCode", pairingCode);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleAutoConnect = () => {
    setIsLoading(true);
    setLoginError("");
    const formData = new FormData();
    formData.append("intent", "AUTO_CONNECT");
    formData.append("name", loaderData.shopDetails?.name);
    formData.append("email", email);
    fetcher.submit(formData, { method: "POST" });
  };

  useEffect(() => {
    if (fetcher.data?.status === 'success' && (fetcher.data?.usedCode || fetcher.data?.auto) && !token && currentStep === 0) {
      if (fetcher.data?.action === 'created') {
        setVerificationSent(true);
      }
      setToken('paired');
      setIsLoading(false);
      setCurrentStep(1);
      setTimeout(() => setCurrentStep(2), 1500);
    }

    if (fetcher.data?.status === 'error' && fetcher.data?.message) {
      setLoginError(fetcher.data.message);
      setIsLoading(false);
    }
  }, [token, fetcher.state, fetcher.data, currentStep]);

  useEffect(() => {
    if (currentStep >= 2 && currentStep < 5) {
      if (fetcher.data?.status === 'success') {
        if (currentStep === 2) setTimeout(() => setCurrentStep(3), 1000);
        if (currentStep === 3) setTimeout(() => setCurrentStep(4), 2500);
        if (currentStep === 4) setTimeout(() => setCurrentStep(5), 2000);
      }
    }
  }, [currentStep, fetcher.data]);

  const isDashboardView = loaderData.isConnected || currentStep === 5;

  return (
    <Page
      title={isDashboardView ? "Retail Intelligence" : "Stockbud Onboarding"}
      secondaryActions={[
        {
          content: 'Help & Documentation',
          onAction: () => window.open('https://docs.stockbud.xyz', '_blank'),
        },
        {
          content: 'Privacy Policy',
          onAction: () => window.open('https://stockbud.xyz/privacy', '_blank'),
        }
      ]}
    >
      {isDashboardView ? (
        <DashboardUI stats={loaderData.stats} shop={loaderData.shop} />
      ) : (
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Box padding="400">
                  <Text variant="headingLg" as="h2" alignment="center">Welcome to Stockbud AI</Text>
                  <Box paddingBlockStart="200">
                    <Text variant="bodyMd" as="p" tone="subdued" alignment="center">Securely connect your store to begin generating retail insights.</Text>
                  </Box>
                </Box>

                <Divider />

                <Box padding="400">
                  {currentStep === 0 ? (
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                      <BlockStack gap="600">
                        {loginError && <Banner tone="critical"><p>{loginError}</p></Banner>}
                        {verificationSent && (
                          <Banner title="Verification Email Sent" tone="success">
                            <p>We've sent a verification email to <strong>{email}</strong>. Please check your inbox and verify your account to unlock full access to the Stockbud Platform.</p>
                          </Banner>
                        )}

                        <Card background="subdued">
                          <Box padding="400">
                            <BlockStack gap="400">
                              <Text variant="headingMd" as="h3">Seamless Connection</Text>
                              <Text variant="bodyMd" as="p">We'll automatically set up your Stockbud account using your Shopify store details.</Text>
                              <TextField
                                label="Confirmed Account Email"
                                type="email"
                                value={email}
                                onChange={setEmail}
                                autoComplete="email"
                                placeholder="name@store.com"
                                helpText="We'll use this email to create your Stockbud account."
                                disabled={isLoading}
                              />
                              <Button
                                variant="primary"
                                size="large"
                                fullWidth
                                onClick={handleAutoConnect}
                                loading={isLoading}
                                disabled={!email || !email.includes('@')}
                              >
                                Connect {loaderData.shopDetails?.name || 'Store'} Now
                              </Button>
                            </BlockStack>
                          </Box>
                        </Card>

                        <Divider label="OR MANUALLY PAIR" />

                        <div style={{ opacity: isLoading ? 0.5 : 1 }}>
                          <FormLayout>
                            <TextField
                              label="Enter Pairing Code"
                              value={pairingCode}
                              onChange={setPairingCode}
                              placeholder="ABC-123-XYZ"
                              helpText="If you already have a Stockbud account, enter the code from your settings."
                              autoComplete="off"
                              disabled={isLoading}
                            />
                            <Button
                              onClick={handleLogin}
                              loading={isLoading}
                              disabled={!pairingCode}
                            >
                              Pair Manual Account
                            </Button>
                          </FormLayout>
                        </div>
                      </BlockStack>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px 0' }}>
                      <PolarisTimeline currentStep={currentStep} />
                    </div>
                  )}
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      )}
    </Page>
  );
}
