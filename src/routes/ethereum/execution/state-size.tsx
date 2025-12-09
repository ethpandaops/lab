import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/state-size';

export const Route = createFileRoute('/ethereum/execution/state-size')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `State Size | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Ethereum execution layer state size visualization showing growth of accounts, storage, and contract code over time',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/state-size` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `State Size | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Ethereum execution layer state size visualization showing growth of accounts, storage, and contract code over time',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/state-size.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/state-size` },
      { name: 'twitter:title', content: `State Size | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Ethereum execution layer state size visualization showing growth of accounts, storage, and contract code over time',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/state-size.png`,
      },
    ],
  }),
});
