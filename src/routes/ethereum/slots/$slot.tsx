import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/ethereum/slots';

export const Route = createFileRoute('/ethereum/slots/$slot')({
  component: DetailPage,
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
        content: '/images/ethereum/slots.png',
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
        content: '/images/ethereum/slots.png',
      },
    ],
  }),
});
