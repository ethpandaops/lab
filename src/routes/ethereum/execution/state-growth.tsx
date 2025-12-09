import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/state-growth';

export const Route = createFileRoute('/ethereum/execution/state-growth')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `State Growth | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Ethereum execution layer state growth visualization showing growth of accounts, storage, and contract code over time',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/state-growth` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `State Growth | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Ethereum execution layer state growth visualization showing growth of accounts, storage, and contract code over time',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/state-growth.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/state-growth` },
      { name: 'twitter:title', content: `State Growth | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Ethereum execution layer state growth visualization showing growth of accounts, storage, and contract code over time',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/state-growth.png`,
      },
    ],
  }),
});
