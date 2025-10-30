import { createFileRoute } from '@tanstack/react-router';

import { IndexPage } from '@/pages/ethereum/entities';

export const Route = createFileRoute('/ethereum/entities/')({
  component: IndexPage,
  head: () => ({
    meta: [
      { title: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Explore Ethereum validator entities. View entity attestation performance, block proposals, and activity.',
      },
      { property: 'og:image', content: '/images/ethereum/entities.png' },
      {
        property: 'og:description',
        content:
          'Explore Ethereum validator entities. View entity attestation performance, block proposals, and activity.',
      },
      { name: 'twitter:image', content: '/images/ethereum/entities.png' },
      {
        name: 'twitter:description',
        content:
          'Explore Ethereum validator entities. View entity attestation performance, block proposals, and activity.',
      },
    ],
  }),
});
