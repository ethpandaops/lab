import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/fork-readiness';

export const Route = createFileRoute('/xatu/fork-readiness')({
  component: IndexPage,
  head: () => ({
    meta: [
      {
        title: `Fork Readiness | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      {
        property: 'og:image',
        content: '/images/experiments/fork-readiness.png',
      },
      {
        property: 'og:description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/fork-readiness.png',
      },
      {
        name: 'twitter:description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
    ],
  }),
});
