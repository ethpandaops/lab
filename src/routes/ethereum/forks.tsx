import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/forks')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Forks',
      getBreadcrumb: () => ({ label: 'Forks' }),
    };
  },
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
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/forks` },
      { name: 'twitter:title', content: `Forks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'View Ethereum consensus layer fork history and upcoming network upgrades',
      },
    ],
  }),
});
