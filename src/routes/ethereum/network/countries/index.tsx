import { createFileRoute } from '@tanstack/react-router';
import { CountriesPage } from '@/pages/ethereum/network';
import { networkSearchSchema } from '@/pages/ethereum/network/constants';

export const Route = createFileRoute('/ethereum/network/countries/')({
  component: CountriesPage,
  validateSearch: networkSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Countries | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'description', content: 'Ethereum consensus peers by the country they connect from' },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/countries` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Countries | ${import.meta.env.VITE_BASE_TITLE}` },
      { property: 'og:description', content: 'Ethereum consensus peers by the country they connect from' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/countries` },
      { name: 'twitter:title', content: `Countries | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'twitter:description', content: 'Ethereum consensus peers by the country they connect from' },
    ],
  }),
});
