import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments';

export const Route = createFileRoute('/experiments/')({
  component: IndexPage,
  head: () => ({
    meta: [
      {
        title: `Experiments | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Explore experimental visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      {
        property: 'og:image',
        content: '/images/experiments.png',
      },
      {
        property: 'og:description',
        content: 'Explore experimental visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments.png',
      },
      {
        name: 'twitter:description',
        content: 'Explore experimental visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
    ],
  }),
});
