import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
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
