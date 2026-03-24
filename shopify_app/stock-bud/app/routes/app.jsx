import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={translations}>
        <NavMenu>
          <a href="/app" rel="home">
            Status
          </a>
        </NavMenu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}


export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
