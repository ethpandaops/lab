import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { LiveSlots } from '@/pages/experiments/LiveSlots';

export const Route = createFileRoute('/experiments/live-slots')({
  component: LiveSlotsPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Live Slots',
    };
  },
});

function LiveSlotsPage(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <LiveSlots />
    </Standard>
  );
}
