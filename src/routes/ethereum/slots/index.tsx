import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/slots';

export const Route = createFileRoute('/ethereum/slots/')({
  component: IndexPage,
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
        content: '/images/ethereum/slots.png',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/slots` },
      { name: 'twitter:title', content: `Slots | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Browse Ethereum consensus layer slots with detailed block, proposer, and blob information.',
      },
      {
        name: 'twitter:image',
        content: '/images/ethereum/slots.png',
      },
    ],
  }),
});
