import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { FeatureGate } from './FeatureGate';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { BASE_URL, PATH_PREFIX } from '@/utils/api-config';
import { mockBounds } from '../../../../.storybook/mocks';

/**
 * FeatureGate is a component that checks if the current page is enabled for the active network.
 * It shows a friendly message if the feature is disabled for the current network, or renders
 * the children if the feature is enabled.
 *
 * The disabled state is the most interesting UI to showcase, as it displays the feature gate
 * message with links to available networks.
 */
const meta: Meta = {
  title: 'Components/Overlays/FeatureGate',
  component: FeatureGate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 600,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

const mockConfigDisabled = {
  networks: [
    {
      name: 'mainnet',
      display_name: 'Mainnet',
      chain_id: 1,
      genesis_time: 1606824023,
      genesis_delay: 0,
      forks: { consensus: {} },
    },
    {
      name: 'hoodi',
      display_name: 'Hoodi',
      chain_id: 560048,
      genesis_time: 1742213400,
      genesis_delay: 0,
      forks: { consensus: {} },
    },
    {
      name: 'sepolia',
      display_name: 'Sepolia',
      chain_id: 11155111,
      genesis_time: 1655733600,
      genesis_delay: 0,
      forks: { consensus: {} },
    },
  ],
  features: [
    {
      path: '/ethereum/data-availability/custody',
      disabled_networks: ['mainnet'],
    },
  ],
};

/**
 * FeatureGate shows a friendly message with the Lab logo when a feature is disabled
 * for the current network. It displays information about which network the feature is
 * not available on, and provides links to networks where the feature is available.
 *
 * This story sets the network to "mainnet" and configures the feature to be disabled on mainnet,
 * showing it's available on Hoodi and Sepolia instead.
 */
export const Default: Story = {
  parameters: {
    msw: {
      handlers: {
        config: http.get(`${BASE_URL}${PATH_PREFIX}/config`, () => {
          return HttpResponse.json(mockConfigDisabled);
        }),
        bounds: http.get(`${BASE_URL}${PATH_PREFIX}/*/bounds`, () => {
          return HttpResponse.json(mockBounds);
        }),
      },
    },
  },
  render: () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 0,
          staleTime: Infinity,
        },
      },
    });

    // Create root and child routes
    const rootRoute = createRootRoute();
    const featureRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/ethereum/data-availability/custody',
      component: () => (
        <FeatureGate>
          <div className="flex min-h-dvh items-center justify-center bg-background">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Feature Content</h1>
              <p className="mt-2 text-muted">This should not be visible when the feature is disabled.</p>
            </div>
          </div>
        </FeatureGate>
      ),
    });

    const routeTree = rootRoute.addChildren([featureRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ['/ethereum/data-availability/custody?network=mainnet'],
      }),
    });

    return (
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <RouterProvider router={router} />
        </NetworkProvider>
      </QueryClientProvider>
    );
  },
};
