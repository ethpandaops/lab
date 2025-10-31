import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/data-availability/das-custody';
import { dasCustodySearchSchema } from '@/pages/ethereum/data-availability/das-custody/IndexPage.types';

export const Route = createFileRoute('/ethereum/data-availability/das-custody/')({
  component: IndexPage,
  validateSearch: dasCustodySearchSchema,
  head: () => ({
    meta: [
      { title: `DAS Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/das-custody` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `DAS Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      { property: 'og:image', content: '/images/experiments/das-custody.png' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/das-custody` },
      { name: 'twitter:title', content: `DAS Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      { name: 'twitter:image', content: '/images/experiments/das-custody.png' },
    ],
  }),
});
