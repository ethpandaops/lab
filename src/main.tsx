import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { createQueryClient } from '@/utils/query-client';
import './index.css';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Import custom error and not found components
import { FatalError } from '@/components/Overlays/FatalError';
import { NotFound } from '@/components/Overlays/NotFound';

const queryClient = createQueryClient();

// Whether the navigation being rendered changed the path. Tabs, filters and pages that only change search params keep
// the scroll position; a new page scrolls to the top, and back/forward restores it.
let pathChanged = true;

// Create a new router instance with custom error and not found components
const router = createRouter({
  routeTree,
  defaultErrorComponent: FatalError,
  defaultNotFoundComponent: NotFound,
  scrollRestoration: () => pathChanged,
  defaultPendingMinMs: 0, // https://github.com/TanStack/router/discussions/1765#discussioncomment-10046260
  defaultPreload: 'intent', // preload on hover/touch
  defaultPreloadDelay: 50, // wait 50ms before preloading (prevents accidental hovers)
});

router.subscribe('onBeforeNavigate', event => {
  pathChanged = event.pathChanged;
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
