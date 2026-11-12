import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import type { Bounds, Config } from '@/lab-api';
import { getBoundsQueryKey, getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';

declare global {
  interface Window {
    /** The configuration, set by lab-backend in index.html. */
    __CONFIG__?: Config;
    /** Each network's bounds, by network name, set by lab-backend in index.html. */
    __BOUNDS__?: Record<string, Bounds>;
  }
}

/**
 * The app's query client; tests and stories pass their own defaults, such as `{ retry: false }`.
 *
 * A failed query keeps retrying, backing off to every 30 s, so the app recovers when the API does.
 *
 * The configuration and bounds lab-backend injected into the page seed the cache, so the first render does not wait
 * for them. The Vite dev server serves the page unmodified, so there they are fetched.
 */
export function createQueryClient(queries: DefaultOptions['queries'] = {}): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: Infinity,
        retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30_000),
        ...queries,
      },
    },
  });

  if (window.__CONFIG__) client.setQueryData(getConfigQueryKey(), window.__CONFIG__);

  for (const [network, bounds] of Object.entries(window.__BOUNDS__ ?? {})) {
    client.setQueryData(getBoundsQueryKey({ path: { network } }), bounds);
  }

  return client;
}
