import type { ComponentType, ReactElement, ReactNode } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from '@tanstack/react-router';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookResult,
  type RenderResult,
} from '@testing-library/react';
import { createQueryClient } from '@/utils/query-client';

interface RenderOptions {
  /** The query client to render with; a fresh one by default. */
  client?: QueryClient;
  /** Providers to place inside the query client and router, such as a `NetworkContext`. */
  wrapper?: ComponentType<{ children: ReactNode }>;
}

/** The app's query client, except that it never retries, so failures show at once. */
function createTestQueryClient(): QueryClient {
  return createQueryClient({ retry: false });
}

function providers(
  client: QueryClient,
  Inner: RenderOptions['wrapper']
): (props: { children: ReactNode }) => ReactElement {
  // Links resolve against a bare root route; no route is rendered. The app's route tree imports
  // every page, which costs seconds per test file.
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RouterContextProvider router={router}>{Inner ? <Inner>{children}</Inner> : children}</RouterContextProvider>
      </QueryClientProvider>
    );
  };
}

/** Renders with a fresh query client and a router for links. */
export function render(
  ui: ReactElement,
  { client = createTestQueryClient(), wrapper }: RenderOptions = {}
): RenderResult & { client: QueryClient } {
  return Object.assign(rtlRender(ui, { wrapper: providers(client, wrapper) }), { client });
}

/** Renders a hook with a fresh query client and a router. */
export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  { client = createTestQueryClient(), wrapper, initialProps }: RenderOptions & { initialProps?: Props } = {}
): RenderHookResult<Result, Props> & { client: QueryClient } {
  return Object.assign(rtlRenderHook(hook, { wrapper: providers(client, wrapper), initialProps }), { client });
}
