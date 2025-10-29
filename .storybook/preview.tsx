import type { Preview, ReactRenderer } from '@storybook/react-vite';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '../src/providers/NetworkProvider';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { ConfigGate } from '../src/components/Overlays/ConfigGate';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { withThemeByClassName } from '@storybook/addon-themes';
import { handlers, mockConfig, mockBounds } from './mocks';
import '../src/index.css';

// Get the base path from environment
const basePath = import.meta.env.STORYBOOK_BASE_PATH || '';

// Initialize MSW with correct service worker URL for GitHub Pages
initialize({
  onUnhandledRequest: 'bypass',
  quiet: true, // Suppress MSW startup messages
  serviceWorker: {
    // Use base path for service worker URL
    url: basePath ? `${basePath}/mockServiceWorker.js` : '/mockServiceWorker.js',
  },
});

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: '',
        dark: 'dark',
        star: 'star',
      },
      defaultTheme: 'dark',
    }),
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

      // Hydrate the QueryClient with mock data (unless story opts out via parameters.hydration = false)
      // This mirrors the hydration pattern in __root.tsx
      if (context.parameters.hydration !== false) {
        // Hydrate config
        queryClient.setQueryData(['config'], mockConfig);

        // Hydrate bounds for each network
        mockConfig.networks.forEach(network => {
          queryClient.setQueryData(['bounds', network.name], mockBounds);
        });
      }

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
          <ThemeProvider>
            <ConfigGate>
              <NetworkProvider>
                <RouterProvider router={router} />
              </NetworkProvider>
            </ConfigGate>
          </ThemeProvider>
        </QueryClientProvider>
      );
    },
  ] as ReactRenderer['decorators'],
  parameters: {
    msw: {
      handlers: handlers,
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
