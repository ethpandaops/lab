import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/pages/ethereum/entities';

export const Route = createFileRoute('/ethereum/entities/$entity')({
  component: DetailPage,
  head: () => ({
    meta: [
      { title: `Entity Details | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Entity Details | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { property: 'og:image', content: '/images/ethereum/entities.png' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities` },
      { name: 'twitter:title', content: `Entity Details | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { name: 'twitter:image', content: '/images/ethereum/entities.png' },
    ],
  }),
});
