import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/clients';
import { clientsSearchSchema } from '@/pages/ethereum/clients/constants';

export const Route = createFileRoute('/ethereum/clients')({
  component: IndexPage,
  validateSearch: clientsSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Clients', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `Proposer Clients | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Consensus and execution client shares of proposed Ethereum blocks, parsed from block graffiti',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/clients` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Proposer Clients | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Consensus and execution client shares of proposed Ethereum blocks, parsed from block graffiti',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/clients.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/clients` },
      { name: 'twitter:title', content: `Proposer Clients | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Consensus and execution client shares of proposed Ethereum blocks, parsed from block graffiti',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/clients.png`,
      },
    ],
  }),
});
