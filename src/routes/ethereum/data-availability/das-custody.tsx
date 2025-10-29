import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/data-availability/das-custody')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'DAS Custody',
    };
  },
  head: () => ({
    meta: [
      { title: `DAS Custody | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      { property: 'og:image', content: '/images/ethereum/data-availability/das-custody.png' },
      {
        property: 'og:description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
      { name: 'twitter:image', content: '/images/ethereum/data-availability/das-custody.png' },
      {
        name: 'twitter:description',
        content: 'PeerDAS data availability visualization showing column custody across validators',
      },
    ],
  }),
});
