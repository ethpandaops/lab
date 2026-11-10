import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/network';
import { overviewSearchSchema } from '@/pages/ethereum/network/constants';

export const Route = createFileRoute('/ethereum/network/')({
  component: IndexPage,
  validateSearch: overviewSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Network | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Ethereum consensus peers and execution nodes by client, country, network, churn, custody, subnets and reachability',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Network | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Ethereum consensus peers and execution nodes by client, country, network, churn, custody, subnets and reachability',
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/network.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network` },
      { name: 'twitter:title', content: `Network | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Ethereum consensus peers and execution nodes by client, country, network, churn, custody, subnets and reachability',
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/network.png` },
    ],
  }),
});
