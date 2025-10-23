import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/locally-built-blocks';

export const Route = createFileRoute('/experiments/locally-built-blocks')({
  component: IndexPage,
  head: () => ({
    meta: [
      { title: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Analyze blocks locally built by sentry nodes. Track block building activity across execution and consensus client combinations.',
      },
      { property: 'og:image', content: '/images/experiments/locally-built-blocks.png' },
      {
        property: 'og:description',
        content:
          'Analyze blocks locally built by sentry nodes. Track block building activity across execution and consensus client combinations.',
      },
      { name: 'twitter:image', content: '/images/experiments/locally-built-blocks.png' },
      {
        name: 'twitter:description',
        content:
          'Analyze blocks locally built by sentry nodes. Track block building activity across execution and consensus client combinations.',
      },
    ],
  }),
});
