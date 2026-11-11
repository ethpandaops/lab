import type { Preview, ReactRenderer } from '@storybook/react-vite';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupWorker, type SetupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { withThemeByClassName } from '@storybook/addon-themes';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ConfigGate } from '@/components/Overlays/ConfigGate';
import type { Theme } from '@/contexts/ThemeContext';
import { boundsFixture, boundsHandlers, configFixture, configHandlers } from '@/test-utils/handlers';
import { BASE_URL } from '@/utils/api-config';
import { createQueryClient } from '@/utils/query-client';
import { getBoundsQueryKey, getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { createCatchAllAssetHandler } from './assetHandlers';
import '../src/index.css';

// Get the base path from environment
const basePath = (import.meta.env.STORYBOOK_BASE_PATH || '').replace(/\/$/, '');

// An API request a story did not mock is a defect: answer 404 and log it,
// which fails the story's test (see vitest-setup.ts). Stories add handlers
// with `parameters.msw.handlers`; those take precedence over this one.
const unmockedApi = http.all(`${BASE_URL}/api/*`, ({ request }) => {
  console.error(`Unmocked API request in story: ${request.method} ${new URL(request.url).pathname}`);
  return new HttpResponse(null, { status: 404 });
});

async function startWorker(): Promise<SetupWorker> {
  // The MSW Vite plugin serves the worker script and emits it into the build.
  const worker = setupWorker(unmockedApi, ...createCatchAllAssetHandler());
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: `${basePath}/mockServiceWorker.js` },
  });
  return worker;
}

const themes: Record<Theme, string> = { light: '', dark: 'dark', star: 'star' };

// The toolbar's starting theme. Vitest runs every story under each theme instead
// (vitest.config.ts sets the theme global per project).
const defaultTheme: Theme = 'dark';

/**
 * Storybook Preview Configuration
 *
 * ## Router Configuration
 *
 * Stories can override the initial router state via `parameters.router`:
 *
 * @example
 * ```tsx
 * export const WithCustomNetwork: Story = {
 *   parameters: {
 *     router: {
 *       initialUrl: '/',
 *       initialSearch: { network: 'holesky' },
 *     },
 *   },
 * };
 * ```
 *
 * This allows testing components that depend on URL search params (e.g., network selection).
 */
const preview: Preview = {
  loaders: [mswLoader(startWorker)],
  decorators: [
    withThemeByClassName<ReactRenderer>({ themes, defaultTheme }),
    (Story, context) => {
      // Allow stories to override query options via parameters.tanstackQuery
      const queryOptions = context.parameters.tanstackQuery?.queries || {};

      // Create QueryClient inside decorator for proper isolation per story
      const queryClient = createQueryClient({
        retry: false,
        staleTime: Infinity,
        ...queryOptions, // Story-level overrides
      });

      // Hydrate the QueryClient with mock data (unless story opts out via parameters.hydration = false)
      // This mirrors the configuration and bounds lab-backend injects into the page
      if (context.parameters.hydration !== false) {
        // Hydrate config
        queryClient.setQueryData(getConfigQueryKey(), configFixture);

        // Hydrate bounds for each network
        configFixture.networks.forEach(network => {
          queryClient.setQueryData(getBoundsQueryKey({ path: { network: network.name } }), boundsFixture);
        });
      }

      // Allow stories to override initial URL and search params via parameters.router
      const routerConfig = context.parameters.router || {};
      const initialUrl = routerConfig.initialUrl || '/';
      const initialSearch = routerConfig.initialSearch || {};

      // Create a root route that renders the Story inside NetworkProvider
      const rootRoute = createRootRoute({
        component: () => (
          <NetworkProvider>
            <Story />
          </NetworkProvider>
        ),
        // Enable search params validation
        validateSearch: () => initialSearch,
      });

      // Create a router with memory history (no browser URL changes)
      // Pass initial search params in the URL if provided
      const searchString =
        Object.keys(initialSearch).length > 0
          ? '?' + new URLSearchParams(initialSearch as Record<string, string>).toString()
          : '';

      const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({
          initialEntries: [initialUrl + searchString],
        }),
        defaultPendingMinMs: 0,
      });

      // The app's provider follows the theme the toolbar (or the test project) chose,
      // so components that read the theme agree with the class on <html>.
      const theme: Theme = context.parameters.themes?.themeOverride || context.globals.theme || defaultTheme;

      return (
        <QueryClientProvider client={queryClient} key={context.id}>
          <ThemeProvider themeOverride={theme}>
            <NotificationProvider>
              <ConfigGate>
                <RouterProvider router={router} />
              </ConfigGate>
            </NotificationProvider>
          </ThemeProvider>
        </QueryClientProvider>
      );
    },
  ],
  parameters: {
    // Accessibility violations fail the story's test.
    a11y: {
      test: 'error',
      config: {
        rules: [
          // Contrast comes from the theme tokens, which are being reworked separately. Turn this
          // back on once they meet it.
          { id: 'color-contrast', enabled: false },
          // react-datepicker names a day "Choose Wednesday, September 30th, 2026", which does not
          // contain its visible "30" as a word. Every other element is still checked.
          { id: 'label-content-name-mismatch', selector: '*:not(.react-datepicker__day)' },
        ],
      },
    },
    msw: {
      handlers: {
        config: configHandlers.success,
        bounds: boundsHandlers.success,
      },
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
        order: ['Foundations', ['Introduction', 'Colours', 'Typography', 'Layout'], '*'],
      },
    },
  },
};

export default preview;
