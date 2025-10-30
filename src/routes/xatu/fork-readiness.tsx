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
      { property: 'og:url', content: 'https://lab.ethpandaops.io/xatu/fork-readiness' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Fork Readiness | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      {
        property: 'og:image',
        content: '/images/experiments/fork-readiness.png',
      },
      { name: 'twitter:url', content: 'https://lab.ethpandaops.io/xatu/fork-readiness' },
      { name: 'twitter:title', content: `Fork Readiness | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/fork-readiness.png',
      },
    ],
  }),
});
