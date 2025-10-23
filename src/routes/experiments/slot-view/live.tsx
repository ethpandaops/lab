import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import { IndexPage } from '@/pages/experiments/slot-view';

export const Route = createFileRoute('/experiments/slot-view/live')({
  component: LiveSlotView,
  head: () => ({
    meta: [
      { title: `Live Slot View | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Real-time visualization of Ethereum beacon chain slot progression with block details, network propagation, and data availability metrics.',
      },
      { property: 'og:image', content: '/images/experiments/slot-view.png' },
      {
        property: 'og:description',
        content:
          'Real-time visualization of Ethereum beacon chain slot progression with block details, network propagation, and data availability metrics.',
      },
      { name: 'twitter:image', content: '/images/experiments/slot-view.png' },
      {
        name: 'twitter:description',
        content:
          'Real-time visualization of Ethereum beacon chain slot progression with block details, network propagation, and data availability metrics.',
      },
    ],
  }),
});

function LiveSlotView(): JSX.Element {
  return (
    <SlotPlayerProvider
      tables={[
        'fct_block_head',
        'fct_block_proposer',
        'fct_block_mev',
        'fct_block_blob_count',
        'fct_block_first_seen_by_node',
        'fct_block_blob_first_seen_by_node',
        'fct_attestation_first_seen_chunked_50ms',
      ]}
      initialMode="continuous"
      initialPlaying={true}
    >
      <IndexPage mode="live" />
    </SlotPlayerProvider>
  );
}
