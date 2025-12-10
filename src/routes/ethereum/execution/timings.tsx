import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/execution/timings')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Engine API Timings',
      getBreadcrumb: () => ({ label: 'Timings' }),
    };
  },
  head: () => ({
    meta: [
      { title: `Engine API Timings | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Monitor CL-EL communication timing for engine_newPayload and engine_getBlobs API calls across the Ethereum network',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/timings` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Engine API Timings | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Monitor CL-EL communication timing for engine_newPayload and engine_getBlobs API calls across the Ethereum network',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/timings.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/timings` },
      { name: 'twitter:title', content: `Engine API Timings | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Monitor CL-EL communication timing for engine_newPayload and engine_getBlobs API calls across the Ethereum network',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/timings.png`,
      },
    ],
  }),
});
