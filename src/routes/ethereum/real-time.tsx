import type { JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/real-time';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';

function RealTimePage(): JSX.Element {
  return (
    <SlotPlayerProvider
      tables={['fct_block_head', 'fct_block_first_seen_by_node', 'fct_attestation_first_seen_chunked_50ms']}
      initialPlaying={true}
    >
      <IndexPage />
    </SlotPlayerProvider>
  );
}

export const Route = createFileRoute('/ethereum/real-time')({
  component: RealTimePage,
  head: () => ({
    meta: [
      {
        title: `Real-Time | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Real-time visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      {
        property: 'og:image',
        content: '/images/ethereum/real-time.png',
      },
      {
        property: 'og:description',
        content: 'Real-time visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      {
        name: 'twitter:image',
        content: '/images/ethereum/real-time.png',
      },
      {
        name: 'twitter:description',
        content: 'Real-time visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
    ],
  }),
});
