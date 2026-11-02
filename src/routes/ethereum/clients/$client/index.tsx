import { createFileRoute } from '@tanstack/react-router';
import { ClientPage } from '@/pages/ethereum/clients';
import { clientSearchSchema } from '@/pages/ethereum/clients/constants';
import { formatClientName } from '@/utils/graffiti';

export const Route = createFileRoute('/ethereum/clients/$client/')({
  component: ClientPage,
  validateSearch: clientSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: ctx => {
    const name = formatClientName(ctx.params.client);
    const title = `${name} | ${import.meta.env.VITE_BASE_TITLE}`;
    const description = `${name} on Ethereum: share of proposed blocks, versions, releases, entities, pairings and nodes`;
    const url = `${import.meta.env.VITE_BASE_URL}/ethereum/clients/${ctx.params.client}`;
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:url', content: url },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/clients.png` },
        { name: 'twitter:url', content: url },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/clients.png` },
      ],
    };
  },
});
