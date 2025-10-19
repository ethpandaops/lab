import { type JSX } from 'react';
import { createRootRouteWithContext, Outlet, HeadContent } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { ConfigGate } from '@/components/ConfigGate';
import type { Config } from '@/hooks/useConfig';
import type { Bounds } from '@/hooks/useBounds';

// Define router context interface
interface MyRouterContext {
  getTitle?: () => string;
}

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
          <HeadContent />
          <Outlet />
        </NetworkProvider>
      </ConfigGate>
    </QueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { title: import.meta.env.VITE_BASE_TITLE },
      { charSet: 'utf-8' },
      { httpEquiv: 'X-UA-Compatible', content: 'IE=edge' },
      {
        name: 'viewport',
        content:
          'width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, minimal-ui',
      },
      { name: 'description', content: 'Experimental platform for exploring Ethereum data and network statistics.' },

      // Schema.org (For Google+)
      { itemProp: 'name', content: import.meta.env.VITE_BASE_TITLE },
      {
        itemProp: 'description',
        content: 'Experimental platform for exploring Ethereum data and network statistics.',
      },
      { itemProp: 'image', content: '/images/header.png' },

      // Twitter Card markup
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:creator', content: '@ethpandaops' },
      { name: 'twitter:url', content: 'https://lab.ethpandaops.io' },
      { name: 'twitter:title', content: import.meta.env.VITE_BASE_TITLE },
      {
        name: 'twitter:description',
        content: 'Experimental platform for exploring Ethereum data and network statistics.',
      },
      { name: 'twitter:site', content: '@ethpandaops' },
      { name: 'twitter:image', content: '/images/header.png' },
      { name: 'twitter:image:alt', content: import.meta.env.VITE_BASE_TITLE },

      // Open Graph markup (Facebook)
      { property: 'og:url', content: 'https://lab.ethpandaops.io/' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: import.meta.env.VITE_BASE_TITLE },
      {
        property: 'og:description',
        content: 'Experimental platform for exploring Ethereum data and network statistics.',
      },
      { property: 'og:image', content: '/images/header.png' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:site_name', content: import.meta.env.VITE_BASE_TITLE },
    ],
    links: [
      { rel: 'canonical', href: 'https://lab.ethpandaops.io' },
      { rel: 'icon', type: 'image/png', href: '/images/lab.png' },
    ],
  }),
});
