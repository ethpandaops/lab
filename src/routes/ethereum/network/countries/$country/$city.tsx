import { createFileRoute } from '@tanstack/react-router';
import { CityPage } from '@/pages/ethereum/network';
import { networkSearchSchema } from '@/pages/ethereum/network/constants';
import { countryName } from '@/pages/ethereum/network/utils/network-census';

const describe = (city: string, country: string): string =>
  `Ethereum consensus peers in ${city}, ${countryName(country)}, by client and network type, over time`;

export const Route = createFileRoute('/ethereum/network/countries/$country/$city')({
  component: CityPage,
  validateSearch: networkSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.city }),
  }),
  head: ctx => {
    const title = `${ctx.params.city}, ${countryName(ctx.params.country)} | ${import.meta.env.VITE_BASE_TITLE}`;
    const url = `${import.meta.env.VITE_BASE_URL}/ethereum/network/countries/${ctx.params.country}/${encodeURIComponent(ctx.params.city)}`;
    const description = describe(ctx.params.city, ctx.params.country);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:url', content: url },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:url', content: url },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    };
  },
});
