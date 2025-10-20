import { useState, useEffect } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import type { SlotEpochData } from './useBeaconClock.types';

const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;

/**
 * Hook to access the Beacon Chain clock (current slot and epoch).
 *
 * This hook:
 * - Uses the network context to get genesis_time
 * - Calculates the current slot based on elapsed time since genesis
 * - Calculates the current epoch from the slot
 * - Updates automatically every second
 *
 * The calculation is based on Ethereum consensus layer specifications:
 * - 1 slot = 12 seconds
 * - 1 epoch = 32 slots
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { slot, epoch } = useBeaconClock();
 *
 *   return (
 *     <div>
 *       <p>Current Slot: {slot}</p>
 *       <p>Current Epoch: {epoch}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {SlotEpochData} Object containing current slot and epoch numbers
 */
export function useBeaconClock(): SlotEpochData {
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

  return { slot, epoch };
}
