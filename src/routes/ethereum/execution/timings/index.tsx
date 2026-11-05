import { createFileRoute, redirect } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/timings';
import { timingsSearchSchema } from '@/pages/ethereum/execution/timings/IndexPage.types';

export const Route = createFileRoute('/ethereum/execution/timings/')({
  component: IndexPage,
  validateSearch: timingsSearchSchema,
  beforeLoad: ({ search }) => {
    // The Performance tab moved to its own page
    if (search.tab === 'performance') {
      throw redirect({
        to: '/ethereum/execution/performance',
        search: {
          // Performance has no 90d, 6mo or 1y range, so those open All
          range:
            search.range === '90days' || search.range === '180days' || search.range === '365days'
              ? 'all'
              : search.range,
        },
      });
    }
    return {
      getBreadcrumb: () => ({ show: false }),
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
