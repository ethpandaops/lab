import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/contributors';

export const Route = createFileRoute('/xatu/contributors/')({
  component: IndexPage,
  head: () => ({
    meta: [
      {
        title: `Contributors | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
      {
        property: 'og:image',
        content: '/images/experiments/contributors.png',
      },
      {
        property: 'og:description',
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/contributors.png',
      },
      {
        name: 'twitter:description',
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
    ],
  }),
});
