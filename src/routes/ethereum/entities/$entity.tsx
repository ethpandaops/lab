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
      { property: 'og:image', content: '/images/ethereum/entities.png' },
      {
        property: 'og:description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { name: 'twitter:image', content: '/images/ethereum/entities.png' },
      {
        name: 'twitter:description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
    ],
  }),
});
