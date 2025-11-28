import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/data-availability/custody';
import { custodySearchSchema } from '@/pages/ethereum/data-availability/custody/IndexPage.types';

export const Route = createFileRoute('/ethereum/data-availability/custody/')({
  component: IndexPage,
  validateSearch: custodySearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/custody` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/data-availability/custody.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/custody` },
      { name: 'twitter:title', content: `Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/data-availability/custody.png`,
      },
    ],
  }),
});
