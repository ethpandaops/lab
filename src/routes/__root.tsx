import { type JSX } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { ConfigGate } from '@/components/ConfigGate';
import type { Config } from '@/hooks/useConfig';
import type { Bounds } from '@/hooks/useBounds';

// Extend Window interface for type safety
declare global {
  interface Window {
    __CONFIG__?: Config;
    __BOUNDS__?: Record<string, Bounds>;
  }
}

// Create QueryClient for hydrated data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: Infinity, // Keep retrying forever - critical queries like config/bounds need to succeed
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
    },
  },
});

// Hydrate the config query if the global variable exists
if (typeof window !== 'undefined' && window.__CONFIG__) {
  queryClient.setQueryData(['config'], window.__CONFIG__);
}

// Hydrate bounds queries for each network if the global variable exists
if (typeof window !== 'undefined' && window.__BOUNDS__) {
  Object.entries(window.__BOUNDS__).forEach(([networkName, boundsData]) => {
    queryClient.setQueryData(['bounds', networkName], boundsData);
  });
}

function RootComponent(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigGate>
        <NetworkProvider>
          <Outlet />
        </NetworkProvider>
      </ConfigGate>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
