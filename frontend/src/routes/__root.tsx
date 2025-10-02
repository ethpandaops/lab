import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
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
  network: z.string().optional(),
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

    if (availableNetworks.length === 0) {
      throw new Error('No networks configured in API response');
    }

    const client = createLabApiClient(bootstrap.backend.url);

    return {
      bootstrap,
      config: response.config,
      availableNetworks,
      client,
      restApiUrl,
    };
  },

  component: RootComponent,
  pendingComponent: () => <LoadingState message="Loading configuration..." />,
  errorComponent: ({ error }) => (
    <ErrorState message="Failed to load application" error={error as Error} />
  ),
});

function RootComponent() {
  const { bootstrap, config, availableNetworks, client, restApiUrl } = Route.useLoaderData();
  const search = Route.useSearch();

  // Populate Zustand store with loader data
  useEffect(() => {
    const { setConfig, setAvailableNetworks, setSelectedNetwork, selectedNetwork } =
      useAppStore.getState();

    setConfig(config);
    setAvailableNetworks(availableNetworks);

    // Determine which network to select
    let networkToSelect: string;

    if (search.network && availableNetworks.includes(search.network)) {
      // URL param is valid, use it
      networkToSelect = search.network;
    } else if (!search.network) {
      // No URL param - check if current stored network is valid
      if (availableNetworks.includes(selectedNetwork)) {
        // Stored network is valid, keep it
        networkToSelect = selectedNetwork;
      } else if (availableNetworks.includes('mainnet')) {
        // Stored network invalid, default to mainnet
        networkToSelect = 'mainnet';
      } else {
        // No mainnet available, use first available
        networkToSelect = availableNetworks[0];
      }
    } else {
      // URL param exists but not in available networks → fallback to mainnet or first
      networkToSelect = availableNetworks.includes('mainnet') ? 'mainnet' : availableNetworks[0];
    }

    // Only update if different from current selection
    if (networkToSelect !== selectedNetwork) {
      setSelectedNetwork(networkToSelect);
    }
  }, [config, availableNetworks, search.network]);

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
