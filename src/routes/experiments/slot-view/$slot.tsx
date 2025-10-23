import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import { IndexPage } from '@/pages/experiments/slot-view';

export const Route = createFileRoute('/experiments/slot-view/$slot')({
  component: StaticSlotView,
  head: () => ({
    meta: [
      { title: `Slot View | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Detailed visualization of a specific Ethereum beacon chain slot with block details, network propagation, and data availability metrics.',
      },
      { property: 'og:image', content: '/images/experiments/slot-view.png' },
      {
        property: 'og:description',
        content:
          'Detailed visualization of a specific Ethereum beacon chain slot with block details, network propagation, and data availability metrics.',
      },
      { name: 'twitter:image', content: '/images/experiments/slot-view.png' },
      {
        name: 'twitter:description',
        content:
          'Detailed visualization of a specific Ethereum beacon chain slot with block details, network propagation, and data availability metrics.',
      },
    ],
  }),
});

function StaticSlotView(): JSX.Element {
  const { slot } = Route.useParams();
  const slotNumber = parseInt(slot, 10);

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
      initialMode="single"
      initialPlaying={false}
      initialSlot={slotNumber}
    >
      <IndexPage mode="static" />
    </SlotPlayerProvider>
  );
}
