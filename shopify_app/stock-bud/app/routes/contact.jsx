import { Page, Layout, Card, Text, BlockStack, Link } from "@shopify/polaris";

export default function Contact() {
    return (
        <Page title="Contact Us">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">
                                Get in Touch
                            </Text>
                            <Text as="p" variant="bodyMd">
                                We'd love to hear from you! Whether you have a question about features, pricing, or need support, our team is ready to answer all your questions.
                            </Text>

                            <BlockStack gap="200">
                                <Text as="p" fontWeight="bold">Email Support:</Text>
                                <Link url="mailto:support@stockbud.app">support@stockbud.app</Link>
                            </BlockStack>

                            <BlockStack gap="200">
                                <Text as="p" fontWeight="bold">Documentation:</Text>
                                <Link url="#">Visit our Help Center</Link>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
