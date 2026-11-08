import { createFileRoute } from '@tanstack/react-router';
import { AsnsPage } from '@/pages/ethereum/network';
import { networkSearchSchema } from '@/pages/ethereum/network/constants';

export const Route = createFileRoute('/ethereum/network/asn/')({
  component: AsnsPage,
  validateSearch: networkSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Networks | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'description', content: 'Ethereum consensus peers by the network (autonomous system) they connect from' },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/asn` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Networks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Ethereum consensus peers by the network (autonomous system) they connect from',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/asn` },
      { name: 'twitter:title', content: `Networks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Ethereum consensus peers by the network (autonomous system) they connect from',
      },
    ],
  }),
});
