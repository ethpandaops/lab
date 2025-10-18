import type { Preview, ReactRenderer } from '@storybook/react-vite';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '../src/providers/NetworkProvider';
import { ConfigGate } from '../src/components/ConfigGate';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from './mocks';
import '../src/index.css';

// Initialize MSW with correct service worker URL for GitHub Pages
initialize({
  onUnhandledRequest: 'bypass',
  serviceWorker: {
    // Use relative path that works both locally and on GitHub Pages
    url: process.env.NODE_ENV === 'production' ? '/lab/mockServiceWorker.js' : '/mockServiceWorker.js',
  },
});

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [
    (Story, context) => {
      // Allow stories to override query options via parameters.tanstackQuery
      const queryOptions = context.parameters.tanstackQuery?.queries || {};

      // Create QueryClient inside decorator for proper isolation per story
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 0, // No retries by default
            staleTime: Infinity,
            ...queryOptions, // Story-level overrides
          },
        },
      });

      // Create a simple root route that just renders the Story
      const rootRoute = createRootRoute({
        component: () => <Story />,
      });

      // Create a router with memory history (no browser URL changes)
      const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({
          initialEntries: ['/'],
        }),
      });

      return (
        <QueryClientProvider client={queryClient} key={context.id}>
          <ConfigGate>
            <NetworkProvider>
              <RouterProvider router={router} />
            </NetworkProvider>
          </ConfigGate>
        </QueryClientProvider>
      );
    },
  ] as ReactRenderer['decorators'],
  parameters: {
    msw: {
      handlers,
    },
    viewport: {
      viewports: INITIAL_VIEWPORTS,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        method: 'alphabetical',
      },
    },
  },
};

export default preview;
