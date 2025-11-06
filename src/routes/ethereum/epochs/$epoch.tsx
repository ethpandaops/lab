import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DetailPage } from '@/pages/ethereum/epochs';

const epochSearchSchema = z.object({
  tab: z.enum(['slots', 'blocks', 'validators', 'mev']).default('slots'),
});

export const Route = createFileRoute('/ethereum/epochs/$epoch')({
  component: DetailPage,
  validateSearch: epochSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.epoch }),
    redirectOnNetworkChange: '/ethereum/epochs',
  }),
  head: ctx => ({
    meta: [
      { title: `Epoch ${ctx.params.epoch} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Detailed analysis of a beacon chain epoch including attestations, block proposals, and validator performance across all slots.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/epochs/${ctx.params.epoch}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Epoch ${ctx.params.epoch} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Detailed analysis of a beacon chain epoch including attestations, block proposals, and validator performance across all slots.',
      },
      { property: 'og:image', content: '/images/ethereum/epochs.png' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/epochs/${ctx.params.epoch}` },
      { name: 'twitter:title', content: `Epoch ${ctx.params.epoch} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Detailed analysis of a beacon chain epoch including attestations, block proposals, and validator performance across all slots.',
      },
      { name: 'twitter:image', content: '/images/ethereum/epochs.png' },
    ],
  }),
});
