import type { JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/slot-view';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';

function SlotViewPage(): JSX.Element {
  return (
    <SlotPlayerProvider
      tables={['fct_block_head', 'fct_block_first_seen_by_node', 'fct_attestation_first_seen_chunked_50ms']}
    >
      <IndexPage />
    </SlotPlayerProvider>
  );
}

export const Route = createFileRoute('/ethereum/slot-view')({
  component: SlotViewPage,
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
