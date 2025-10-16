import type { Preview, ReactRenderer } from '@storybook/react-vite';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '../src/providers/NetworkProvider';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from './mocks';
import '../src/index.css';

// Initialize MSW
initialize({
  onUnhandledRequest: 'bypass',
});

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [
    Story => {
      // Create QueryClient inside decorator for proper isolation per story
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
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
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <RouterProvider router={router} />
          </NetworkProvider>
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
