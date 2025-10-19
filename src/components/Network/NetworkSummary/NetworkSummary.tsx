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
    return <div className="bg-[#1e293b] px-4 py-2 text-sm/6 text-slate-500">Loading...</div>;
  }

  if (orientation === 'vertical') {
    return (
      <div className="bg-[#1e293b] px-4 py-3 font-mono text-sm/6">
        <div className="flex items-center justify-between pb-2">
          <span className="text-slate-400">Slot</span>
          <span className="text-white">{slot}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Epoch</span>
          <span className="text-white">{epoch}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b] px-4 py-2 font-mono text-sm/6">
      <span className="text-slate-400">Slot</span> <span className="text-white">{slot}</span>
      <span className="text-slate-500"> · </span>
      <span className="text-slate-400">Epoch</span> <span className="text-white">{epoch}</span>
    </div>
  );
}
