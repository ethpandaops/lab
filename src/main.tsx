import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import './index.css';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Import custom error and not found components
import { FatalError } from '@/components/Overlays/FatalError';
import { NotFound } from '@/components/Overlays/NotFound';

// Create a new router instance with custom error and not found components
const router = createRouter({
  routeTree,
  defaultErrorComponent: FatalError,
  defaultNotFoundComponent: NotFound,
  scrollRestoration: true,
  defaultPendingMinMs: 0, // https://github.com/TanStack/router/discussions/1765#discussioncomment-10046260
  defaultPreload: 'intent', // preload on hover/touch
  defaultPreloadDelay: 50, // wait 50ms before preloading (prevents accidental hovers)
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
