import { type JSX } from 'react';
import { useSlotPlayer } from '@/hooks/useSlotPlayer';
import { Card } from '@/components/Layout/Card';

/**
 * Displays the current slot and live status for contributor metrics.
 *
 * Shows:
 * - Current slot number
 * - LIVE badge when displaying real-time data
 *
 * Must be used within a SlotPlayerProvider context.
 */
export function SlotPlayerControls(): JSX.Element {
  const { currentSlot, isLive } = useSlotPlayer();

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm/6 text-muted">Current Slot</div>
          <div className="text-2xl/8 font-bold text-foreground">{currentSlot.toLocaleString()}</div>
        </div>
        {isLive && <div className="rounded-sm bg-success/10 px-3 py-1 text-sm/6 font-medium text-success">LIVE</div>}
      </div>
    </Card>
  );
}
