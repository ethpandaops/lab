import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import {
  fctBlockHeadServiceList,
  fctBlockProposerServiceList,
  fctBlockBlobCountServiceList,
  fctBlockProposerEntityServiceList,
} from '@/api/sdk.gen';
import type { FctBlockProposer, FctBlockBlobCount, FctBlockHead, FctBlockProposerEntity } from '@/api/types.gen';
import type { SlotData } from './useSlotsData.types';

/**
 * Number of slots to fetch per page
 */
const SLOTS_PER_PAGE = 25;

/**
 * Maximum number of slots to keep in memory (windowing)
 */
const MAX_SLOTS_IN_MEMORY = 100;

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
 * Page parameter for infinite query pagination
 */
interface PageParam {
  /**
   * Starting slot for this page
   */
  startSlot: number;
  /**
   * Ending slot for this page
   */
  endSlot: number;
  /**
   * Direction of pagination (newer or older slots)
   */
  direction: 'newer' | 'older';
}

/**
 * Return type for useInfiniteSlotsData hook
 */
export interface UseInfiniteSlotsDataReturn {
  /**
   * Array of all slot data across all pages
   */
  slots: SlotData[];
  /**
   * Whether initial data is loading
   */
  isLoading: boolean;
  /**
   * Whether more data is being fetched
   */
  isFetchingNextPage: boolean;
  /**
   * Whether previous data is being fetched
   */
  isFetchingPreviousPage: boolean;
  /**
   * Whether there are more newer slots to load
   */
  hasNextPage: boolean;
  /**
   * Whether there are more older slots to load
   */
  hasPreviousPage: boolean;
  /**
   * Function to load more newer slots
   */
  fetchNextPage: () => void;
  /**
   * Function to load more older slots
   */
  fetchPreviousPage: () => void;
  /**
   * Error if any occurred
   */
  error: Error | null;
  /**
   * Current slot from beacon clock
   */
  currentSlot: number;
}

/**
 * Hook to fetch and aggregate slots data with infinite scrolling/pagination.
 *
 * This hook implements an append-only data model with these characteristics:
 * - Uses TanStack Query's infinite query for proper pagination
 * - Anchors to the initial slot at mount (stable reference point)
 * - Supports bidirectional pagination (newer and older slots)
 * - Appends new data without replacing existing data
 * - Implements windowing to keep max 100 slots in memory
 * - Only shows skeleton loader on initial load
 * - No auto-refresh - data only updates on manual page reload
 * - Aggregates data from multiple API endpoints:
 *   - fct_block_head: Block details
 *   - fct_block_proposer: Proposer info and status
 *   - fct_block_blob_count: Blob count
 *   - fct_block_proposer_entity: Proposer entity info
 *
 * @returns {UseInfiniteSlotsDataReturn} Object with slots, pagination controls, and loading states
 *
 * @example
 * ```tsx
 * function SlotsPage() {
 *   const {
 *     slots,
 *     isLoading,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage
 *   } = useInfiniteSlotsData();
 *
 *   if (isLoading) return <LoadingContainer />;
 *
 *   return (
 *     <>
 *       <Table data={slots} />
 *       {hasNextPage && (
 *         <button onClick={fetchNextPage} disabled={isFetchingNextPage}>
 *           Load More
 *         </button>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useInfiniteSlotsData(): UseInfiniteSlotsDataReturn {
  const { slot: currentSlot } = useBeaconClock();
  const { currentNetwork } = useNetwork();

  /**
   * Anchor slot - set once on mount and never changes.
   * This ensures stable pagination boundaries and prevents auto-refetching
   * when the beacon clock advances.
   */
  const anchorSlot = useRef<number | null>(null);

  // Set anchor slot once when we have a valid current slot
  useEffect(() => {
    if (currentSlot > 0 && anchorSlot.current === null) {
      anchorSlot.current = currentSlot;
    }
  }, [currentSlot]);

  /**
   * Fetch function for a single page of slots data
   */
  const fetchSlotsPage = useCallback(
    async (pageParam: PageParam): Promise<{ slots: SlotData[]; pageParam: PageParam }> => {
      if (!currentNetwork?.genesis_time) {
        return { slots: [], pageParam };
      }

      const { startSlot, endSlot } = pageParam;
      const startTimestamp = slotToTimestamp(startSlot, currentNetwork.genesis_time);
      const endTimestamp = slotToTimestamp(endSlot, currentNetwork.genesis_time);

      // Fetch all four data sources in parallel
      const [blockHeadResult, proposerResult, blobCountResult, proposerEntityResult] = await Promise.all([
        fctBlockHeadServiceList({
          query: {
            slot_start_date_time_gte: startTimestamp,
            slot_start_date_time_lte: endTimestamp,
            page_size: SLOTS_PER_PAGE,
            order_by: 'slot desc',
          },
        }),
        fctBlockProposerServiceList({
          query: {
            slot_start_date_time_gte: startTimestamp,
            slot_start_date_time_lte: endTimestamp,
            page_size: SLOTS_PER_PAGE,
            order_by: 'slot desc',
          },
        }),
        fctBlockBlobCountServiceList({
          query: {
            slot_start_date_time_gte: startTimestamp,
            slot_start_date_time_lte: endTimestamp,
            page_size: SLOTS_PER_PAGE,
            order_by: 'slot desc',
          },
        }),
        fctBlockProposerEntityServiceList({
          query: {
            slot_start_date_time_gte: startTimestamp,
            slot_start_date_time_lte: endTimestamp,
            page_size: SLOTS_PER_PAGE,
            order_by: 'slot desc',
          },
        }),
      ]);

      // Combine data from all queries
      const slots: SlotData[] = [];
      for (let slot = endSlot; slot >= startSlot; slot--) {
        const epoch = Math.floor(slot / SLOTS_PER_EPOCH);

        // Find data for this slot from each query
        const proposerData = proposerResult.data?.fct_block_proposer?.find((p: FctBlockProposer) => p.slot === slot);
        const blobData = blobCountResult.data?.fct_block_blob_count?.find((b: FctBlockBlobCount) => b.slot === slot);
        const blockData = blockHeadResult.data?.fct_block_head?.find((b: FctBlockHead) => b.slot === slot);
        const entityData = proposerEntityResult.data?.fct_block_proposer_entity?.find(
          (e: FctBlockProposerEntity) => e.slot === slot
        );

        // Determine if slot has data
        const hasData = Boolean(proposerData || blockData);

        // Calculate timestamp for this slot
        const timestamp = slotToTimestamp(slot, currentNetwork.genesis_time);

        slots.push({
          slot,
          epoch,
          proposerIndex: proposerData?.proposer_validator_index ?? null,
          blobCount: blobData?.blob_count ?? null,
          status: proposerData?.status ?? null,
          hasData,
          blockRoot: proposerData?.block_root ?? blockData?.block_root ?? null,
          timestamp,
          proposerEntity: entityData?.entity ?? null,
        });
      }

      return { slots, pageParam };
    },
    [currentNetwork]
  );

  /**
   * Infinite query for slots data
   *
   * Key implementation details:
   * - queryKey uses a stable 'slots' key (no dynamic values) to prevent auto-refetching
   * - initialPageParam anchors to the slot at mount time
   * - refetchOnMount: false prevents refetching when component remounts
   * - refetchInterval: false disables background polling
   * - refetchOnWindowFocus: false prevents refetch on tab focus
   * - staleTime: Infinity means data never becomes stale automatically
   */
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['slots-infinite'],
    queryFn: async ({ pageParam }) => {
      return fetchSlotsPage(pageParam as PageParam);
    },
    initialPageParam: {
      startSlot: Math.max(0, (anchorSlot.current ?? currentSlot) - SLOTS_PER_PAGE + 1),
      endSlot: anchorSlot.current ?? currentSlot,
      direction: 'older' as const,
    } as PageParam,
    getNextPageParam: (lastPage): PageParam | undefined => {
      // Next page = older slots (decreasing slot numbers)
      const oldestSlot = lastPage.pageParam.startSlot;
      if (oldestSlot <= 0) return undefined;

      const newEndSlot = oldestSlot - 1;
      const newStartSlot = Math.max(0, newEndSlot - SLOTS_PER_PAGE + 1);

      return {
        startSlot: newStartSlot,
        endSlot: newEndSlot,
        direction: 'older',
      };
    },
    getPreviousPageParam: (firstPage): PageParam | undefined => {
      // Previous page = newer slots (increasing slot numbers)
      const newestSlot = firstPage.pageParam.endSlot;

      // Don't go beyond the current wall clock slot (allow loading up to current time)
      if (newestSlot >= currentSlot) return undefined;

      const newStartSlot = newestSlot + 1;
      const newEndSlot = Math.min(currentSlot, newStartSlot + SLOTS_PER_PAGE - 1);

      return {
        startSlot: newStartSlot,
        endSlot: newEndSlot,
        direction: 'newer',
      };
    },
    maxPages: Math.ceil(MAX_SLOTS_IN_MEMORY / SLOTS_PER_PAGE), // Implement windowing
    enabled: currentSlot > 0 && Boolean(currentNetwork?.genesis_time),
    refetchOnMount: false, // Don't refetch on remount - preserve loaded data
    refetchInterval: false, // Disable auto-refresh to maintain stable pagination
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on reconnect
    staleTime: Infinity, // Data never becomes stale - only refresh on manual page reload
  });

  /**
   * Flatten all pages into a single array
   */
  const slots = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];

    // Flatten all slots from all pages
    const allSlots = infiniteQuery.data.pages.flatMap(page => page.slots);

    // Remove duplicates (shouldn't happen, but safety check)
    const uniqueSlots = new Map<number, SlotData>();
    allSlots.forEach(slot => {
      uniqueSlots.set(slot.slot, slot);
    });

    // Sort by slot descending (newest first)
    return Array.from(uniqueSlots.values()).sort((a, b) => b.slot - a.slot);
  }, [infiniteQuery.data?.pages]);

  /**
   * Aggregate errors
   */
  const error = useMemo(() => {
    if (infiniteQuery.error) {
      return infiniteQuery.error as Error;
    }
    return null;
  }, [infiniteQuery.error]);

  return {
    slots,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isFetchingPreviousPage: infiniteQuery.isFetchingPreviousPage,
    hasNextPage: infiniteQuery.hasNextPage ?? false,
    hasPreviousPage: infiniteQuery.hasPreviousPage ?? false,
    fetchNextPage: () => infiniteQuery.fetchNextPage(),
    fetchPreviousPage: () => infiniteQuery.fetchPreviousPage(),
    error,
    currentSlot, // Current wall clock slot (for display)
  };
}
