import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/data-availability/probes';
import { probesSearchSchema } from '@/pages/ethereum/data-availability/probes/IndexPage.types';

export const Route = createFileRoute('/ethereum/data-availability/probes/')({
  component: IndexPage,
  validateSearch: probesSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Probes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'PeerDAS data availability probes showing column sampling results across the network',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/probes` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Probes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'PeerDAS data availability probes showing column sampling results across the network',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/data-availability/probes.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/probes` },
      { name: 'twitter:title', content: `Probes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'PeerDAS data availability probes showing column sampling results across the network',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/data-availability/probes.png`,
      },
    ],
  }),
});
