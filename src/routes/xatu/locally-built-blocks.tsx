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
      { property: 'og:url', content: 'https://lab.ethpandaops.io/xatu/locally-built-blocks' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      {
        property: 'og:image',
        content: '/images/experiments/locally-built-blocks.png',
      },
      { name: 'twitter:url', content: 'https://lab.ethpandaops.io/xatu/locally-built-blocks' },
      { name: 'twitter:title', content: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/locally-built-blocks.png',
      },
    ],
  }),
});
