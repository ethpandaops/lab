import { createFileRoute } from '@tanstack/react-router';
import { CountryPage } from '@/pages/ethereum/network';
import { networkSearchSchema } from '@/pages/ethereum/network/constants';
import { countryName } from '@/pages/ethereum/network/utils/network-census';

export const Route = createFileRoute('/ethereum/network/countries/$country')({
  component: CountryPage,
  validateSearch: networkSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: countryName(params.country) }),
    redirectOnNetworkChange: '/ethereum/network/countries',
  }),
  head: ctx => ({
    meta: [
      { title: `${countryName(ctx.params.country)} | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'description', content: 'Ethereum consensus peers in one country, by client, over time' },
      {
        property: 'og:url',
        content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/countries/${ctx.params.country}`,
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${countryName(ctx.params.country)} | ${import.meta.env.VITE_BASE_TITLE}` },
      { property: 'og:description', content: 'Ethereum consensus peers in one country, by client, over time' },
      {
        name: 'twitter:url',
        content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/countries/${ctx.params.country}`,
      },
      { name: 'twitter:title', content: `${countryName(ctx.params.country)} | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'twitter:description', content: 'Ethereum consensus peers in one country, by client, over time' },
    ],
  }),
});
