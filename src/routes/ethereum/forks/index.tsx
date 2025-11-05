import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/forks';

export const Route = createFileRoute('/ethereum/forks/')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }), // Index routes should not show breadcrumbs
  }),
  head: () => ({
    meta: [
      {
        title: `Forks | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'View Ethereum consensus layer fork history and upcoming network upgrades',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/forks` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Forks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'View Ethereum consensus layer fork history and upcoming network upgrades',
      },
      {
        property: 'og:image',
        content: '/images/ethereum/forks.png',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/forks` },
      { name: 'twitter:title', content: `Forks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'View Ethereum consensus layer fork history and upcoming network upgrades',
      },
      {
        name: 'twitter:image',
        content: '/images/ethereum/forks.png',
      },
    ],
  }),
});
