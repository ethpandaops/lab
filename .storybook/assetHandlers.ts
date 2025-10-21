import { http, HttpResponse, passthrough } from 'msw';

// Get the base path from environment
const basePath = import.meta.env.STORYBOOK_BASE_PATH || '';

/**
 * Creates MSW handlers to intercept and rewrite asset paths when running on GitHub Pages
 * Create a single catch-all handler for non-API requests
 */
export function createCatchAllAssetHandler() {
  // Only create handler if we have a base path
  if (!basePath) {
    return [];
  }

  return [
    http.get('*', async ({ request }) => {
      const url = new URL(request.url);

      // Skip API requests and already-prefixed paths
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith(basePath)) {
        return passthrough();
      }

      // Skip MSW service worker
      if (url.pathname === '/mockServiceWorker.js') {
        return passthrough();
      }

      // Check if this looks like a static asset (has file extension)
      const hasExtension = /\.\w+$/.test(url.pathname);

      if (hasExtension) {
        // Redirect to the correct path with base prefix
        const newUrl = `${url.origin}${basePath}${url.pathname}`;

        try {
          const response = await fetch(newUrl);
          const body = await response.arrayBuffer();

          const headers = new Headers();
          const contentType = response.headers.get('content-type');
          if (contentType) {
            headers.set('content-type', contentType);
          }

          return new HttpResponse(body, {
            status: response.status,
            headers,
          });
        } catch (error) {
          // Let the browser handle it if fetch fails
          return passthrough();
        }
      }

      return passthrough();
    }),
  ];
}
