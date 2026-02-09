import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/consensus/overview';

export const Route = createFileRoute('/ethereum/consensus/overview')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Overview', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `Consensus Overview | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Ethereum consensus layer overview with blob count metrics and charts',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/consensus/overview` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Consensus Overview | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Ethereum consensus layer overview with blob count metrics and charts',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/consensus/overview.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/consensus/overview` },
      { name: 'twitter:title', content: `Consensus Overview | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Ethereum consensus layer overview with blob count metrics and charts',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/consensus/overview.png`,
      },
    ],
  }),
});
