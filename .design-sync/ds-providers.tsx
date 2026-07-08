import './ds-body-guard';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { ConfigGate } from '@/components/Overlays/ConfigGate';
import { mockConfig, mockBounds } from '../.storybook/mocks';

/**
 * Provider chain for design-sync previews. Mirrors the decorator chain in
 * .storybook/preview.tsx (QueryClient hydrated with mock config/bounds,
 * ThemeProvider, ConfigGate, a memory router rendering NetworkProvider) so
 * previews get the same context the storybook reference does. Theme is pinned
 * to dark to match the storybook default theme deterministically.
 */
export function DesignSyncProvider({ children }: { children: React.ReactNode }) {
  const [{ queryClient, router }] = React.useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: 0, staleTime: Infinity } },
    });
    qc.setQueryData(['config'], mockConfig);
    mockConfig.networks.forEach(network => {
      qc.setQueryData(['bounds', network.name], mockBounds);
    });

    const rootRoute = createRootRoute({
      component: () => <NetworkProvider>{children}</NetworkProvider>,
      validateSearch: () => ({}),
    });

    const r = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      defaultPendingMinMs: 0,
    });

    return { queryClient: qc, router: r };
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider themeOverride="dark">
        <ConfigGate>
          <RouterProvider router={router} />
        </ConfigGate>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
