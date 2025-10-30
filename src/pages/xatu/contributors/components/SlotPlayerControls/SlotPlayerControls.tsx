import { type JSX } from 'react';
import { useSlotPlayerState, useSlotPlayerProgress } from '@/hooks/useSlotPlayer';
import { Card } from '@/components/Layout/Card';
import { SECONDS_PER_SLOT } from '@/utils/beacon';

/**
 * Displays the current slot, live status, and elapsed time for contributor metrics.
 *
 * Shows:
 * - Current slot number
 * - LIVE badge when displaying real-time data
 * - Elapsed timer showing seconds since slot start (counts up from 0 to 12)
 *
 * Must be used within a SlotPlayerProvider context.
 */
export function SlotPlayerControls(): JSX.Element {
  const { currentSlot, isLive } = useSlotPlayerState();
  const { slotProgress } = useSlotPlayerProgress();

  // Calculate elapsed time: current progress converted to seconds
  const elapsedSeconds = Math.min(SECONDS_PER_SLOT, slotProgress / 1000);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm/6 text-muted">Current Slot</div>
          <div className="text-2xl/8 font-bold text-foreground">{currentSlot.toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Elapsed Timer */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-foreground">{elapsedSeconds.toFixed(1)}</span>
            <span className="text-sm text-muted">sec</span>
          </div>
          {/* Live Badge */}
          {isLive && <div className="rounded-sm bg-success/10 px-3 py-1 text-sm/6 font-medium text-success">LIVE</div>}
        </div>
      </div>
    </Card>
  );
}
