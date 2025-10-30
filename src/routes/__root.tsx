import { type JSX, useState, useEffect } from 'react';
import { createRootRouteWithContext, Outlet, HeadContent, Link, useRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { ConfigGate } from '@/components/Overlays/ConfigGate';
import { Sidebar } from '@/components/Layout/Sidebar';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Close sidebar on route navigation (path changes only, not search params)
  useEffect(() => {
    const unsubscribe = router.subscribe('onBeforeLoad', event => {
      // Only close sidebar if the path actually changed, not just search params
      if (event.pathChanged) {
        setSidebarOpen(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfigGate>
          <NetworkProvider>
            <HeadContent />
            <div className="min-h-dvh bg-background">
              {/* Sidebar (mobile + desktop) */}
              <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

              {/* Mobile header */}
              <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-6 lg:hidden">
                <div className="flex items-center gap-x-6">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="group -m-2.5 flex h-10 w-10 flex-col items-center justify-center gap-1.5 p-2.5 lg:hidden"
                    aria-label="Toggle sidebar"
                    aria-pressed={sidebarOpen}
                  >
                    <span className="sr-only">Toggle sidebar</span>
                    <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-[[aria-pressed=true]]:translate-y-2 group-[[aria-pressed=true]]:rotate-45" />
                    <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-[[aria-pressed=true]]:opacity-0" />
                    <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-[[aria-pressed=true]]:-translate-y-2 group-[[aria-pressed=true]]:-rotate-45" />
                  </button>
                  <Link to="/" className="flex items-center gap-2">
                    <img alt="Lab Logo" src="/images/lab.png" className="size-8" />
                    <span className="font-sans text-xl font-bold text-foreground">The Lab</span>
                  </Link>
                </div>
                <ThemeToggle />
              </div>

              {/* Main content */}
              <main className="bg-background lg:pl-72">
                <Outlet />
              </main>
            </div>
          </NetworkProvider>
        </ConfigGate>
      </ThemeProvider>
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
