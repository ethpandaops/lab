import { createFileRoute } from '@tanstack/react-router';
import { VersionPage } from '@/pages/ethereum/clients';
import { versionSearchSchema } from '@/pages/ethereum/clients/constants';
import { formatClientName } from '@/utils/graffiti';

export const Route = createFileRoute('/ethereum/clients/$client/$version')({
  component: VersionPage,
  validateSearch: versionSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.version }),
  }),
  head: ctx => {
    const name = `${formatClientName(ctx.params.client)} ${ctx.params.version}`;
    const title = `${name} | ${import.meta.env.VITE_BASE_TITLE}`;
    const description = `${name}: adoption over time, time to reach most blocks, entities running it and how it compares`;
    const url = `${import.meta.env.VITE_BASE_URL}/ethereum/clients/${ctx.params.client}/${ctx.params.version}`;
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
