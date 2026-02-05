import { redirect, Form as RemixForm, useLoaderData, Link } from "react-router";
import { login } from "../../shopify.server";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Icon,
  Grid,
  Box
} from "@shopify/polaris";
import { StoreIcon, ChartVerticalIcon, ProductIcon, CashDollarIcon } from "@shopify/polaris-icons";

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
    <Page>
      <Layout>
        <Layout.Section>
          <BlockStack align="center" inlineAlign="center" gap="500">
            <Box paddingBlockEnd="400">
              <Text as="h1" variant="heading3xl" alignment="center">
                Welcome to StockBud
              </Text>
              <Box paddingBlockStart="200">
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  The ultimate tool for inventory and sales intelligence.
                </Text>
              </Box>
            </Box>

            {showForm && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Connect your Store
                  </Text>
                  <RemixForm method="post" action="/auth/login">
                    <FormLayout>
                      <TextField
                        label="Shop domain"
                        name="shop"
                        type="text"
                        autoComplete="off"
                        placeholder="my-shop-domain.myshopify.com"
                        prefix={<Icon source={StoreIcon} tone="base" />}
                        helpText="e.g: my-shop-domain.myshopify.com"
                      />
                      <Button submit variant="primary" fullWidth size="large">
                        Log in
                      </Button>
                    </FormLayout>
                  </RemixForm>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockStart="800">
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                <Card>
                  <BlockStack gap="200" align="center">
                    <InlineStack align="center">
                      <Box padding="200" background="bg-surface-active" borderRadius="200">
                        <Icon source={ChartVerticalIcon} tone="base" />
                      </Box>
                    </InlineStack>
                    <Text as="h3" variant="headingSm" alignment="center">Real-time Analytics</Text>
                    <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                      Track your sales as they happen with dynamic charts.
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                <Card>
                  <BlockStack gap="200" align="center">
                    <InlineStack align="center">
                      <Box padding="200" background="bg-surface-active" borderRadius="200">
                        <Icon source={ProductIcon} tone="base" />
                      </Box>
                    </InlineStack>
                    <Text as="h3" variant="headingSm" alignment="center">Inventory Mgmt</Text>
                    <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                      Keep your stock levels in check and never run out.
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                <Card>
                  <BlockStack gap="200" align="center">
                    <InlineStack align="center">
                      <Box padding="200" background="bg-surface-active" borderRadius="200">
                        <Icon source={CashDollarIcon} tone="base" />
                      </Box>
                    </InlineStack>
                    <Text as="h3" variant="headingSm" alignment="center">Financial Reports</Text>
                    <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                      Detailed insights into your revenue and profits.
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>
          </Box>
        </Layout.Section>

        <Layout.Section>
          <InlineStack align="center" gap="400">
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
