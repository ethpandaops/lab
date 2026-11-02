import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/clients';
import { clientsSearchSchema } from '@/pages/ethereum/clients/constants';

export const Route = createFileRoute('/ethereum/clients/')({
  component: IndexPage,
  validateSearch: clientsSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Clients | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Every Ethereum consensus and execution client: share of proposed blocks, diversity, releases and nodes',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/clients` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Clients | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Every Ethereum consensus and execution client: share of proposed blocks, diversity, releases and nodes',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/clients.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/clients` },
      { name: 'twitter:title', content: `Clients | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Every Ethereum consensus and execution client: share of proposed blocks, diversity, releases and nodes',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/clients.png`,
      },
    ],
  }),
});
