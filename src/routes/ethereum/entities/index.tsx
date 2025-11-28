import { createFileRoute } from '@tanstack/react-router';

import { IndexPage } from '@/pages/ethereum/entities';

export const Route = createFileRoute('/ethereum/entities/')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }), // Index routes should not show breadcrumbs
  }),
  head: () => ({
    meta: [
      { title: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Explore Ethereum validator entities. View entity attestation performance, block proposals, and activity.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Explore Ethereum validator entities. View entity attestation performance, block proposals, and activity.',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities` },
      { name: 'twitter:title', content: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Explore Ethereum validator entities. View entity attestation performance, block proposals, and activity.',
      },
    ],
  }),
});
