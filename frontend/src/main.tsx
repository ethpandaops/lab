import './index.css';
import ErrorBoundary from '@/ErrorBoundary';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ApiModeProvider } from '@/contexts/apiMode';
import { DebugProvider } from '@/contexts/debug';
import { GlobalDebugPanel } from '@/components/debug/GlobalDebugPanel';
import { SlotDataTrackerProvider } from '@/contexts/slotDataTracker';
import { routeTree } from './routeTree.gen';

const MAX_RETRIES = 1;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      retry: MAX_RETRIES,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const container = document.querySelector('#root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ApiModeProvider>
            <SlotDataTrackerProvider>
              <DebugProvider>
                <RouterProvider router={router} />
                <GlobalDebugPanel />
              </DebugProvider>
            </SlotDataTrackerProvider>
          </ApiModeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
