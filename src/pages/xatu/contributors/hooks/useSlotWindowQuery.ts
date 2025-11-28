import { useMemo } from 'react';
import { useSlotPlayerState } from '@/hooks/useSlotPlayer';
import { useNetwork } from '@/hooks/useNetwork';
import { SECONDS_PER_SLOT } from '@/utils/beacon';

/**
 * Custom hook to compute slot-based query ranges for contributor metrics.
 *
 * Returns time range (Unix timestamps) for API queries based on current slot
 * and a configurable window size (number of slots before/after current).
 *
 * @param windowSize - Number of slots to query before and after current slot (default: 50)
 * @returns Object with slot_start_date_time_gte and slot_start_date_time_lte for API queries, or null if not ready
 *
 * @example
 * ```tsx
 * const queryRange = useSlotWindowQuery(100); // ±100 slots
 * const { data } = useFctBlockFirstSeenByNodeServiceList({
 *   query: {
 *     username_eq: "alice",
 *     ...queryRange,
 *   }
 * });
 * ```
 */
export function useSlotWindowQuery(windowSize: number = 50): {
  slot_start_date_time_gte: number;
  slot_start_date_time_lte: number;
  minSlot: number;
  maxSlot: number;
} | null {
  const { currentSlot } = useSlotPlayerState();
  const { currentNetwork } = useNetwork();

  return useMemo(() => {
    if (!currentNetwork || currentSlot === 0) return null;

    const minSlot = Math.max(0, currentSlot - windowSize);
    const maxSlot = currentSlot + windowSize;

    // Convert slots to Unix timestamps
    const slot_start_date_time_gte = currentNetwork.genesis_time + minSlot * SECONDS_PER_SLOT;
    const slot_start_date_time_lte = currentNetwork.genesis_time + maxSlot * SECONDS_PER_SLOT;

    return {
      slot_start_date_time_gte,
      slot_start_date_time_lte,
      minSlot,
      maxSlot,
    };
  }, [currentSlot, currentNetwork, windowSize]);
}
