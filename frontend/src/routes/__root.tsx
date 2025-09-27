import { createRootRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import fetchBootstrap from '@/bootstrap';
import { createLabApiClient } from '@/api/client';
import { RestApiClient } from '@/api/rest/client';
import ApplicationProvider from '@/providers/application';
import { ModalProvider } from '@/contexts/ModalContext';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { useAppStore } from '@/stores/appStore';
import ScrollToTop from '@/components/common/ScrollToTop';

const searchSchema = z.object({
  network: z.string().optional().default('mainnet'),
});

export const Route = createRootRoute({
  validateSearch: searchSchema,

  loader: async () => {
    const bootstrap = await fetchBootstrap();
    const restApiUrl = bootstrap.backend.restApiUrl || bootstrap.backend.url;
    const restClient = new RestApiClient(restApiUrl);
    const response = await restClient.getConfig();

    if (!response.config) {
      throw new Error('Failed to load configuration');
    }

    const availableNetworks = Object.keys(response.config.ethereum?.networks || {});
    const client = createLabApiClient(bootstrap.backend.url);

    return {
      bootstrap,
      config: response.config,
      availableNetworks,
      client,
      restApiUrl,
    };
  },

  beforeLoad: ({ search, context }) => {
    const { setConfig, setAvailableNetworks, setSelectedNetwork } = useAppStore.getState();

    if (context.loaderData) {
      const { config, availableNetworks } = context.loaderData;
      setConfig(config);
      setAvailableNetworks(availableNetworks);

      if (search.network && availableNetworks.includes(search.network)) {
        setSelectedNetwork(search.network);
      } else if (!availableNetworks.includes(search.network)) {
        setSelectedNetwork(availableNetworks[0] || 'mainnet');
      }
    }
  },

  component: RootComponent,
  pendingComponent: () => <LoadingState message="Loading configuration..." />,
  errorComponent: ({ error }) => (
    <ErrorState message="Failed to load application" error={error as Error} />
  ),
});

function RootComponent() {
  const { bootstrap, config, client, restApiUrl } = Route.useLoaderData();

  return (
    <ApplicationProvider
      api={{ client, baseUrl: bootstrap.backend.url, restApiUrl }}
      beacon={{ config }}
    >
      <ModalProvider>
        <ScrollToTop />
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </ModalProvider>
    </ApplicationProvider>
  );
}
