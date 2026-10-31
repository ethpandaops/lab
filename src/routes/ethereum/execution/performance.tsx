import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/performance';
import { performanceSearchSchema } from '@/pages/ethereum/execution/performance/IndexPage.types';

export const Route = createFileRoute('/ethereum/execution/performance')({
  component: IndexPage,
  validateSearch: performanceSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Performance', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `Execution Performance | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Execution throughput per client in Mgas/s, gas limit headroom, cost models and per-opcode execution cost from engine_newPayload timings',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/performance` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Execution Performance | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Execution throughput per client in Mgas/s, gas limit headroom, cost models and per-opcode execution cost from engine_newPayload timings',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/performance.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/performance` },
      { name: 'twitter:title', content: `Execution Performance | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Execution throughput per client in Mgas/s, gas limit headroom, cost models and per-opcode execution cost from engine_newPayload timings',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/performance.png`,
      },
    ],
  }),
});
