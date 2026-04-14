import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider, Frame, Toast } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);


  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const [toastProps, setToastProps] = useState(null);

  const toggleToast = useCallback(() => setToastProps(null), []);

  useEffect(() => {
    const handleEvent = (event) => {
      const { message, type } = event.detail;
      setToastProps({ content: message, error: type === 'error' });
    };
    globalThis.addEventListener('app:notification', handleEvent);
    return () => globalThis.removeEventListener('app:notification', handleEvent);
  }, []);

  const toastMarkup = toastProps ? (
    <Toast content={toastProps.content} error={toastProps.error} onDismiss={toggleToast} />
  ) : null;

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={translations}>
        <Frame>
          <NavMenu>
            <a href="/app" rel="home">
              Status
            </a>
          </NavMenu>
          <Outlet />
          {toastMarkup}
        </Frame>
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
