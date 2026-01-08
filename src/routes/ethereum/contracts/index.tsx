import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/contracts';

export const Route = createFileRoute('/ethereum/contracts/')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }), // Index routes should not show breadcrumbs
  }),
  head: () => ({
    meta: [
      { title: `Contracts | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Top 100 Ethereum contracts by storage size with state expiry savings analysis.',
      },
      {
        property: 'og:description',
        content: 'Top 100 Ethereum contracts by storage size with state expiry savings analysis.',
      },
      {
        name: 'twitter:description',
        content: 'Top 100 Ethereum contracts by storage size with state expiry savings analysis.',
      },
    ],
  }),
});
