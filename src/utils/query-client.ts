import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import type { ZodType } from 'zod';
import { getBoundsQueryKey, getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { zBounds, zConfig } from '@/lab-api/zod.gen';

declare global {
  interface Window {
    /** The configuration, set by lab-backend in index.html. */
    __CONFIG__?: unknown;
    /** Each network's bounds, by network name, set by lab-backend in index.html. */
    __BOUNDS__?: Record<string, unknown>;
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

  const config = injected('configuration', zConfig, window.__CONFIG__);
  if (config) client.setQueryData(getConfigQueryKey(), config);

  for (const [network, value] of Object.entries(window.__BOUNDS__ ?? {})) {
    const bounds = injected(`${network} bounds`, zBounds, value);
    if (bounds) client.setQueryData(getBoundsQueryKey({ path: { network } }), bounds);
  }

  return client;
}

/**
 * An injected value, or undefined when it is missing or does not match the spec. It is returned whole rather than
 * parsed: the generated client also only validates responses, so seeded and fetched data keep the same fields.
 */
function injected<T>(name: string, schema: ZodType<T>, value: unknown): T | undefined {
  if (value === undefined) return undefined;

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    console.error(`the injected ${name} does not match the spec`, parsed.error);
    return undefined;
  }

  return value as T;
}
