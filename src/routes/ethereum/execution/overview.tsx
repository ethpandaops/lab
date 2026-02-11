import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/overview';
import { executionOverviewSearchSchema } from '@/pages/ethereum/execution/overview/constants';

export const Route = createFileRoute('/ethereum/execution/overview')({
  component: IndexPage,
  validateSearch: executionOverviewSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Overview', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `Execution Overview | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Ethereum execution layer overview with transaction throughput metrics and TPS charts',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/overview` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Execution Overview | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Ethereum execution layer overview with transaction throughput metrics and TPS charts',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/overview.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/overview` },
      { name: 'twitter:title', content: `Execution Overview | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Ethereum execution layer overview with transaction throughput metrics and TPS charts',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/overview.png`,
      },
    ],
  }),
});
