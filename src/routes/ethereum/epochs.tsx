import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/epochs')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Epochs',
    getBreadcrumb: () => ({ label: 'Epochs' }),
  }),
  head: () => ({
    meta: [
      { title: `Epochs | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Explore Ethereum beacon chain epochs. View recent epoch data and dive into detailed epoch analytics.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/epochs` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Epochs | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Explore Ethereum beacon chain epochs. View recent epoch data and dive into detailed epoch analytics.',
      },
      { property: 'og:image', content: '/images/ethereum/epochs.png' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/epochs` },
      { name: 'twitter:title', content: `Epochs | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Explore Ethereum beacon chain epochs. View recent epoch data and dive into detailed epoch analytics.',
      },
      { name: 'twitter:image', content: '/images/ethereum/epochs.png' },
    ],
  }),
});
