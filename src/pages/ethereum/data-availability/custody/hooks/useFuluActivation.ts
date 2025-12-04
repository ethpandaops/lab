import { useMemo } from 'react';
import { useForks } from '@/hooks/useForks';
import { useNetwork } from '@/hooks/useNetwork';
import { epochToTimestamp } from '@/utils/beacon';

/** Slots per epoch constant */
const SLOTS_PER_EPOCH = 32;

/**
 * Fulu activation information for filtering custody probe queries.
 * PeerDAS/Data Column Availability only exists after Fulu fork activation.
 */
export interface FuluActivation {
  /** Fulu fork activation epoch */
  epoch: number;
  /** First slot in the Fulu fork (epoch * 32) */
  slot: number;
  /** Unix timestamp (seconds) when Fulu activates */
  dateTime: number;
}

/**
 * Return type for the useFuluActivation hook
 */
export interface UseFuluActivationResult {
  /** Fulu activation data (null if not configured or loading) */
  fuluActivation: FuluActivation | null;
  /** Whether the hook is still loading fork data */
  isLoading: boolean;
}

/**
 * Hook to get Fulu fork activation data for filtering custody probe queries.
 *
 * PeerDAS/Data Column Availability data only exists after the Fulu fork activation.
 * This hook provides the activation slot, epoch, and timestamp so that query
 * parameters can include `slot_gte` to filter out pre-Fulu data server-side.
 *
 * @example
 * ```tsx
 * function ProbesList() {
 *   const { fuluActivation } = useFuluActivation();
 *
 *   const { data } = useQuery({
 *     ...intCustodyProbeOrderBySlotServiceListOptions({
 *       query: {
 *         // ... other params
 *         // Filter out pre-Fulu slots at query level
 *         ...(fuluActivation && { slot_gte: fuluActivation.slot }),
 *       },
 *     }),
 *   });
 * }
 * ```
 */
export function useFuluActivation(): UseFuluActivationResult {
  const { allForks, isLoading: forksLoading } = useForks();
  const { currentNetwork } = useNetwork();

  return useMemo(() => {
    // Still loading
    if (forksLoading || !currentNetwork) {
      return {
        fuluActivation: null,
        isLoading: true,
      };
    }

    // Find Fulu fork
    const fuluFork = allForks.find(f => f.name === 'fulu');

    // Fulu not configured on this network
    if (!fuluFork) {
      return {
        fuluActivation: null,
        isLoading: false,
      };
    }

    // Calculate activation data
    const fuluSlot = fuluFork.epoch * SLOTS_PER_EPOCH;
    const fuluDateTime = epochToTimestamp(fuluFork.epoch, currentNetwork.genesis_time);

    return {
      fuluActivation: {
        epoch: fuluFork.epoch,
        slot: fuluSlot,
        dateTime: fuluDateTime,
      },
      isLoading: false,
    };
  }, [allForks, forksLoading, currentNetwork]);
}
