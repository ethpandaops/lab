import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import {
  fctBlockHeadServiceListOptions,
  fctBlockProposerServiceListOptions,
  fctBlockBlobCountServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { UseSlotsDataReturn, SlotData } from './useSlotsData.types';

/**
 * Number of slots to display in the list
 */
const SLOTS_TO_SHOW = 50;

/**
 * Converts a slot number to Unix timestamp for API queries
 * @param slot - Beacon chain slot number
 * @param genesisTime - Network genesis time (Unix timestamp in seconds)
 * @returns Unix timestamp in seconds
 */
function slotToTimestamp(slot: number, genesisTime: number): number {
  return genesisTime + slot * 12; // 12 seconds per slot
}

/**
 * Hook to fetch and aggregate slots data for the slots list page.
 *
 * This hook:
 * - Uses the current wallclock slot from useBeaconClock
 * - Fetches data for the last 50 slots from the current slot
 * - Aggregates data from multiple API endpoints:
 *   - fct_block_head: Block details
 *   - fct_block_proposer: Proposer info and status
 *   - fct_block_blob_count: Blob count
 * - Returns an array of slot data with all information combined
 *
 * @returns {UseSlotsDataReturn} Object containing slots array, loading state, and error
 *
 * @example
 * ```tsx
 * function SlotsPage() {
 *   const { slots, isLoading, error } = useSlotsData();
 *
 *   if (isLoading) return <LoadingContainer />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <Table data={slots} />;
 * }
 * ```
 */
export function useSlotsData(): UseSlotsDataReturn {
  const { slot: currentSlot } = useBeaconClock();
  const { currentNetwork } = useNetwork();

  // Calculate slot range to fetch (last 50 slots from current)
  const { startSlot, endSlot } = useMemo(() => {
    const end = currentSlot;
    const start = Math.max(0, currentSlot - SLOTS_TO_SHOW + 1);
    return { startSlot: start, endSlot: end };
  }, [currentSlot]);

  // Convert slot range to timestamps for API queries
  const { startTimestamp, endTimestamp } = useMemo(() => {
    if (!currentNetwork?.genesis_time) {
      return { startTimestamp: 0, endTimestamp: 0 };
    }
    return {
      startTimestamp: slotToTimestamp(startSlot, currentNetwork.genesis_time),
      endTimestamp: slotToTimestamp(endSlot, currentNetwork.genesis_time),
    };
  }, [startSlot, endSlot, currentNetwork]);

  // Fetch block head data
  const blockHeadQuery = useQuery({
    ...fctBlockHeadServiceListOptions({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: SLOTS_TO_SHOW,
      },
    }),
    enabled: startTimestamp > 0 && endTimestamp > 0,
  });

  // Fetch proposer data
  const proposerQuery = useQuery({
    ...fctBlockProposerServiceListOptions({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: SLOTS_TO_SHOW,
      },
    }),
    enabled: startTimestamp > 0 && endTimestamp > 0,
  });

  // Fetch blob count data
  const blobCountQuery = useQuery({
    ...fctBlockBlobCountServiceListOptions({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: SLOTS_TO_SHOW,
      },
    }),
    enabled: startTimestamp > 0 && endTimestamp > 0,
  });

  // Aggregate loading state
  const isLoading = blockHeadQuery.isLoading || proposerQuery.isLoading || blobCountQuery.isLoading;

  // Aggregate errors (only report the first error)
  const error = useMemo(() => {
    if (blockHeadQuery.error) return blockHeadQuery.error as Error;
    if (proposerQuery.error) return proposerQuery.error as Error;
    if (blobCountQuery.error) return blobCountQuery.error as Error;
    return null;
  }, [blockHeadQuery.error, proposerQuery.error, blobCountQuery.error]);

  // Combine data from all queries
  const slots = useMemo(() => {
    // Generate all slots in range (even if no data exists)
    const allSlots: SlotData[] = [];
    for (let slot = endSlot; slot >= startSlot; slot--) {
      const epoch = Math.floor(slot / SLOTS_PER_EPOCH);

      // Find data for this slot from each query
      const proposerData = proposerQuery.data?.fct_block_proposer?.find(p => p.slot === slot);
      const blobData = blobCountQuery.data?.fct_block_blob_count?.find(b => b.slot === slot);
      const blockData = blockHeadQuery.data?.fct_block_head?.find(b => b.slot === slot);

      // Determine if slot has data (check if we have block data OR proposer data)
      const hasData = Boolean(proposerData || blockData);

      allSlots.push({
        slot,
        epoch,
        proposerIndex: proposerData?.proposer_validator_index ?? null,
        blobCount: blobData?.blob_count ?? null,
        status: proposerData?.status ?? null,
        hasData,
        blockRoot: proposerData?.block_root ?? blockData?.block_root ?? null,
      });
    }

    return allSlots;
  }, [startSlot, endSlot, blockHeadQuery.data, proposerQuery.data, blobCountQuery.data]);

  return {
    slots,
    isLoading,
    error,
  };
}
