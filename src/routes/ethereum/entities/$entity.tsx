import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DetailPage } from '@/pages/ethereum/entities';

const entitySearchSchema = z.object({
  tab: z.enum(['recent', 'attestations', 'blocks']).default('recent'),
});

export const Route = createFileRoute('/ethereum/entities/$entity')({
  component: DetailPage,
  validateSearch: entitySearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.entity }),
    redirectOnNetworkChange: '/ethereum/entities',
  }),
  head: ctx => ({
    meta: [
      { title: `${ctx.params.entity} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities/${ctx.params.entity}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${ctx.params.entity} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { property: 'og:image', content: '/images/ethereum/entities.png' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities/${ctx.params.entity}` },
      { name: 'twitter:title', content: `${ctx.params.entity} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Detailed analysis of a validator entity including attestation performance, block proposals, and historical activity trends.',
      },
      { name: 'twitter:image', content: '/images/ethereum/entities.png' },
    ],
  }),
});
