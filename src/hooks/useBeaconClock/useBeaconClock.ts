import { useState, useEffect, useCallback } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import { useInterval } from '@/hooks/useInterval';
import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import type { SlotEpochData } from './useBeaconClock.types';

/**
 * Hook to access the Beacon Chain clock (current slot and epoch).
 *
 * This hook:
 * - Uses the network context to get genesis_time
 * - Calculates the current slot based on elapsed time since genesis
 * - Calculates the current epoch from the slot
 * - Updates automatically every second
 * - Handles backgrounded tabs (recalculates when tab becomes visible)
 * - Validates genesis_time and handles edge cases
 * - Optimized to prevent unnecessary re-renders (only updates when slot/epoch change)
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
 * @example Testing
 * ```tsx
 * // In tests, you can control time
 * const { slot } = useBeaconClock(() => Date.UTC(2024, 0, 1));
 * ```
 *
 * @param getCurrentTime - Optional function to get current time (for testing). Defaults to Date.now
 * @returns {SlotEpochData} Object containing current slot and epoch numbers
 */
export function useBeaconClock(getCurrentTime: () => number = () => Date.now()): SlotEpochData {
  const { currentNetwork } = useNetwork();
  const [slot, setSlot] = useState<number>(0);
  const [epoch, setEpoch] = useState<number>(0);

  // Reset state immediately when network changes to avoid showing stale values
  useEffect(() => {
    setSlot(0);
    setEpoch(0);
  }, [currentNetwork]);

  const calculateSlotAndEpoch = useCallback((): void => {
    // Validate genesis_time exists and is valid
    if (!currentNetwork?.genesis_time || currentNetwork.genesis_time <= 0) {
      if (currentNetwork && (!currentNetwork.genesis_time || currentNetwork.genesis_time <= 0)) {
        console.warn('[useBeaconClock] Invalid genesis_time:', currentNetwork.genesis_time);
      }
      setSlot(0);
      setEpoch(0);
      return;
    }

    const now = Math.floor(getCurrentTime() / 1000);
    const elapsed = now - currentNetwork.genesis_time;

    // Handle pre-genesis or invalid time (e.g., system clock issues)
    if (elapsed < 0) {
      console.warn('[useBeaconClock] Current time is before genesis_time. Elapsed:', elapsed);
      setSlot(0);
      setEpoch(0);
      return;
    }

    const newSlot = Math.floor(elapsed / SECONDS_PER_SLOT);
    const newEpoch = Math.floor(newSlot / SLOTS_PER_EPOCH);

    // Only update state if values have changed (prevents 11/12 unnecessary re-renders per slot)
    setSlot(prev => (prev !== newSlot ? newSlot : prev));
    setEpoch(prev => (prev !== newEpoch ? newEpoch : prev));
  }, [currentNetwork, getCurrentTime]);

  // Calculate immediately on mount or network change
  useEffect(() => {
    calculateSlotAndEpoch();
  }, [calculateSlotAndEpoch]);

  // Update every second using declarative interval hook
  useInterval(calculateSlotAndEpoch, currentNetwork ? 1000 : null);

  // Recalculate when tab becomes visible (handles browser backgrounding)
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        calculateSlotAndEpoch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [calculateSlotAndEpoch]);

  return { slot, epoch };
}
