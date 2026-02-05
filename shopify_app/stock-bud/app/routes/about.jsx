import { Page, Layout, Card, Text, BlockStack, List } from "@shopify/polaris";

export default function About() {
    return (
        <Page title="About StockBud">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">
                                Empowering Merchants
                            </Text>
                            <Text as="p" variant="bodyMd">
                                StockBud is the ultimate inventory and sales reporting companion for Shopify merchants.
                                Our mission is to simplify data analysis so you can focus on growing your business.
                            </Text>
                            <Text as="h3" variant="headingSm">
                                Key Benefits:
                            </Text>
                            <List>
                                <List.Item>Real-time inventory tracking</List.Item>
                                <List.Item>Comprehensive sales reports</List.Item>
                                <List.Item>User-friendly dashboard</List.Item>
                            </List>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
