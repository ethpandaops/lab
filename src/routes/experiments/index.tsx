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
        content: 'Explore visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/experiments` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Experiments | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Explore visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/experiments.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/experiments` },
      { name: 'twitter:title', content: `Experiments | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Explore visualizations and data analysis tools for Ethereum and Xatu networks.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/experiments.png`,
      },
    ],
  }),
});
