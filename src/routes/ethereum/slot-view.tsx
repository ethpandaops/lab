import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/slot-view';

export const Route = createFileRoute('/ethereum/slot-view')({
  component: IndexPage,
  head: () => ({
    meta: [
      {
        title: `Slot View | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Real-time visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      {
        property: 'og:image',
        content: '/images/experiments/slot-view.png',
      },
      {
        property: 'og:description',
        content: 'Real-time visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/slot-view.png',
      },
      {
        name: 'twitter:description',
        content: 'Real-time visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
    ],
  }),
});
