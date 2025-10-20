import { type JSX, useState, useEffect } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import type { NetworkSummaryProps } from './NetworkSummary.types';

const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;

/**
 * Network summary component.
 *
 * Displays the current slot and epoch for the selected network.
 *
 * Features:
 * - Real-time updates every second
 * - Can be displayed horizontally or vertically
 * - Monospace font for better number readability
 *
 * @example
 * ```tsx
 * // Horizontal layout (default)
 * <NetworkSummary />
 *
 * // Vertical layout (for mobile panels)
 * <NetworkSummary orientation="vertical" />
 * ```
 */
export function NetworkSummary({ orientation = 'horizontal' }: NetworkSummaryProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const [slot, setSlot] = useState<number>(0);
  const [epoch, setEpoch] = useState<number>(0);

  useEffect(() => {
    if (!currentNetwork) return;

    const calculateSlotAndEpoch = (): void => {
      const now = Math.floor(Date.now() / 1000);
      const currentSlot = Math.floor((now - currentNetwork.genesis_time) / SECONDS_PER_SLOT);
      const currentEpoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);

      setSlot(currentSlot);
      setEpoch(currentEpoch);
    };

    // Calculate immediately
    calculateSlotAndEpoch();

    // Update every second
    const interval = setInterval(calculateSlotAndEpoch, 1000);

    return () => clearInterval(interval);
  }, [currentNetwork]);

  if (!currentNetwork) {
    return <div className="bg-card px-4 py-2 text-sm/6 text-muted">Loading...</div>;
  }

  if (orientation === 'vertical') {
    return (
      <div className="mt-auto border-t border-accent/20 bg-surface p-4">
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between">
            <span className="text-tertiary">Slot</span>
            <span className="font-medium text-primary">{slot}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-tertiary">Epoch</span>
            <span className="font-medium text-primary">{epoch}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      <span className="text-tertiary">Slot </span>
      <span className="text-primary">{slot}</span>
      <span className="mx-2 text-tertiary">·</span>
      <span className="text-tertiary">Epoch </span>
      <span className="text-primary">{epoch}</span>
    </div>
  );
}
