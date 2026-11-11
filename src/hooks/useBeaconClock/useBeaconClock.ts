import { useState, useEffect, useCallback } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import type { Network } from '@/hooks/useNetwork';
import { useInterval } from '@/hooks/useInterval';
import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import type { SlotEpochData } from './useBeaconClock.types';

/**
 * Read the current slot on a network from its genesis_time.
 *
 * @returns The slot, or 0 when genesis_time is missing or invalid or the time is before genesis
 */
function readSlot(network: Network | null, getCurrentTime: () => number): number {
  // Validate genesis_time exists and is valid
  if (!network?.genesis_time || network.genesis_time <= 0) {
    if (network) {
      console.warn('[useBeaconClock] Invalid genesis_time:', network.genesis_time);
    }
    return 0;
  }

  const now = Math.floor(getCurrentTime() / 1000);
  const elapsed = now - network.genesis_time;

  // Handle pre-genesis or invalid time (e.g., system clock issues)
  if (elapsed < 0) {
    console.warn('[useBeaconClock] Current time is before genesis_time. Elapsed:', elapsed);
    return 0;
  }

  return Math.floor(elapsed / SECONDS_PER_SLOT);
}

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
  const genesisTime = currentNetwork?.genesis_time;

  // The slot, with the genesis_time it was read against
  const [clock, setClock] = useState(() => ({ genesisTime, slot: readSlot(currentNetwork, getCurrentTime) }));

  // Read the clock again as soon as the network changes, so the previous network's slot never shows
  if (clock.genesisTime !== genesisTime) {
    setClock({ genesisTime, slot: readSlot(currentNetwork, getCurrentTime) });
  }

  const calculateSlotAndEpoch = useCallback((): void => {
    const slot = readSlot(currentNetwork, getCurrentTime);
    // Only update state if the slot has changed (prevents 11/12 unnecessary re-renders per slot)
    setClock(prev => (prev.genesisTime === genesisTime && prev.slot === slot ? prev : { genesisTime, slot }));
  }, [currentNetwork, genesisTime, getCurrentTime]);

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

  const { slot } = clock;
  return { slot, epoch: Math.floor(slot / SLOTS_PER_EPOCH) };
}
