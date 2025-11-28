import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/fork-readiness';

export const Route = createFileRoute('/xatu/fork-readiness')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Fork Readiness' }),
  }),
  head: () => ({
    meta: [
      {
        title: `Fork Readiness | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/fork-readiness` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Fork Readiness | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/fork-readiness.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/fork-readiness` },
      { name: 'twitter:title', content: `Fork Readiness | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Monitor Ethereum client readiness for upcoming network forks and protocol upgrades.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/fork-readiness.png`,
      },
    ],
  }),
});
