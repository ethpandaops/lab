import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Experiments',
    };
  },
  head: () => ({
    meta: [
      {
        title: `Experiments | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Explore experimental visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/experiments` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Experiments | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Explore experimental visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      {
        property: 'og:image',
        content: '/images/experiments.png',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/experiments` },
      { name: 'twitter:title', content: `Experiments | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Explore experimental visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments.png',
      },
    ],
  }),
});
