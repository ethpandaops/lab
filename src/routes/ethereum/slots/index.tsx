import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IndexPage } from '@/pages/ethereum/slots';

/** `from` is the top slot of the page shown; absent means the latest page. */
const searchSchema = z.object({
  from: z.coerce.number().int().nonnegative().optional(),
});

export const Route = createFileRoute('/ethereum/slots/')({
  component: IndexPage,
  validateSearch: searchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }), // Index routes should not show breadcrumbs
  }),
  head: () => ({
    meta: [
      {
        title: `Slots | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Browse Ethereum consensus layer slots with detailed block, proposer, and blob information.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/slots` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Slots | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Browse Ethereum consensus layer slots with detailed block, proposer, and blob information.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/slots.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/slots` },
      { name: 'twitter:title', content: `Slots | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Browse Ethereum consensus layer slots with detailed block, proposer, and blob information.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/slots.png`,
      },
    ],
  }),
});
