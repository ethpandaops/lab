import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/pages/ethereum/epochs';

export const Route = createFileRoute('/ethereum/epochs/$epoch')({
  component: DetailPage,
  head: () => ({
    meta: [
      { title: `Epoch Details | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Detailed analysis of a beacon chain epoch including attestations, block proposals, and validator performance across all slots.',
      },
      { property: 'og:url', content: 'https://lab.ethpandaops.io/ethereum/epochs' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Epoch Details | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Detailed analysis of a beacon chain epoch including attestations, block proposals, and validator performance across all slots.',
      },
      { property: 'og:image', content: '/images/ethereum/epochs.png' },
      { name: 'twitter:url', content: 'https://lab.ethpandaops.io/ethereum/epochs' },
      { name: 'twitter:title', content: `Epoch Details | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Detailed analysis of a beacon chain epoch including attestations, block proposals, and validator performance across all slots.',
      },
      { name: 'twitter:image', content: '/images/ethereum/epochs.png' },
    ],
  }),
});
