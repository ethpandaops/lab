import { http, HttpResponse, passthrough } from 'msw';

// Get the base path from environment
const basePath = import.meta.env.STORYBOOK_BASE_PATH || '';

/**
 * Creates MSW handlers to intercept and rewrite asset paths when running on GitHub Pages
 * This ensures that requests to /images/*, /fonts/*, etc. are properly redirected
 * to include the base path (e.g., /lab/images/*)
 */
export function createAssetHandlers() {
  // Only create handlers if we have a base path (GitHub Pages deployment)
  if (!basePath) {
    return [];
  }

  // Asset paths that should be intercepted and rewritten
  const assetPaths = [
    '/images/**/*',
    '/fonts/**/*',
    '/icons/**/*',
    '/favicon.ico',
    '/favicon.png',
    '/favicon.svg',
    '/robots.txt',
    '/manifest.json',
  ];

  return assetPaths.map(pattern => {
    // Create a regex pattern from the glob-like pattern
    const regexPattern = pattern
      .replace(/\//g, '\\/')
      .replace(/\*\*\/\*/g, '.*')
      .replace(/\*/g, '[^/]*');

    return http.get(new RegExp(`^${regexPattern}$`), async ({ request }) => {
      const url = new URL(request.url);

      // If the path doesn't start with the base path, redirect to the correct URL
      if (!url.pathname.startsWith(basePath)) {
        // Construct the new URL with the base path
        const newUrl = `${url.origin}${basePath}${url.pathname}`;

        // Fetch the resource from the correct location
        try {
          const response = await fetch(newUrl);

          // Return the response with proper headers
          const body = await response.arrayBuffer();
          const headers = new Headers();

          // Copy relevant headers from the original response
          const contentType = response.headers.get('content-type');
          if (contentType) {
            headers.set('content-type', contentType);
          }

          return new HttpResponse(body, {
            status: response.status,
            headers,
          });
        } catch (error) {
          // If fetch fails, pass through to let the browser handle it
          return passthrough();
        }
      }

      // If the path already has the base path, pass through
      return passthrough();
    });
  });
}

/**
 * Alternative approach: Create a single catch-all handler for non-API requests
 * This is simpler but less precise than the above approach
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
