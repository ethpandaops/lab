import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/locally-built-blocks';

export const Route = createFileRoute('/xatu/locally-built-blocks')({
  component: IndexPage,
  head: () => ({
    meta: [
      {
        title: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      {
        property: 'og:image',
        content: '/images/experiments/locally-built-blocks.png',
      },
      {
        property: 'og:description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/locally-built-blocks.png',
      },
      {
        name: 'twitter:description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
    ],
  }),
});
