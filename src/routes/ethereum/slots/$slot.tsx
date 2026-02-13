import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DetailPage } from '@/pages/ethereum/slots';

const slotSearchSchema = z.object({
  tab: z
    .enum(['overview', 'timeline', 'block', 'attestations', 'propagation', 'blobs', 'execution', 'mev', 'resources'])
    .default('overview'),
  contributor: z.string().optional(),
  node: z.string().optional(),
  metric: z.enum(['mean', 'min', 'max']).optional(),
  memMetric: z.enum(['vm_rss', 'rss_anon', 'rss_file', 'vm_swap']).optional(),
  refNodes: z
    .preprocess(value => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    }, z.boolean())
    .optional(),
});

export const Route = createFileRoute('/ethereum/slots/$slot')({
  component: DetailPage,
  validateSearch: slotSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.slot }),
    redirectOnNetworkChange: '/ethereum/slots',
  }),
  head: ctx => ({
    meta: [
      {
        title: `Slot ${ctx.params.slot} | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content:
          'Detailed visualization and analysis of Ethereum consensus layer slot data including attestations, block propagation, and blob availability.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/slots/${ctx.params.slot}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Slot ${ctx.params.slot} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Detailed visualization and analysis of Ethereum consensus layer slot data including attestations, block propagation, and blob availability.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/slots.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/slots/${ctx.params.slot}` },
      { name: 'twitter:title', content: `Slot ${ctx.params.slot} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Detailed visualization and analysis of Ethereum consensus layer slot data including attestations, block propagation, and blob availability.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/slots.png`,
      },
    ],
  }),
});
