import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctBlockDataColumnCompletionServiceList } from '@/api/sdk.gen';
import type { FctBlockDataColumnCompletion } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { QUERY_RETRIES, SLOWEST_BLOCKS, SLOWEST_BLOCKS_MAX_DAYS } from '../constants';

export interface UseSlowestBlocksResult {
  blocks: FctBlockDataColumnCompletion[];
  /** Start of the window the blocks are ranked in, unix seconds */
  since: number;
  /** Whether the page's window was longer than the ranking reads, so the ranking covers only its end */
  capped: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * The blocks whose columns sentry nodes took longest to complete (p90 from slot start), ranked by the API within
 * the page's window, or its last few days when the window is longer.
 */
export function useSlowestBlocks(windowStart: number, windowEnd: number): UseSlowestBlocksResult {
  const { currentNetwork } = useNetwork();
  const earliest = windowEnd - SLOWEST_BLOCKS_MAX_DAYS * 86_400;
  const since = Math.max(windowStart, earliest);

  const result = useQuery({
    queryKey: ['partial-columns', 'slowest', currentNetwork?.name, since, windowEnd],
    queryFn: async ({ signal }) => {
      const response = await fctBlockDataColumnCompletionServiceList({
        query: {
          slot_start_date_time_gte: since,
          slot_start_date_time_lt: windowEnd,
          order_by: 'p90_completion_slot_start_diff desc, slot_start_date_time desc',
          page_size: SLOWEST_BLOCKS,
        },
        signal,
        throwOnError: true,
      });
      return response.data?.fct_block_data_column_completion ?? [];
    },
    enabled: !!currentNetwork && since > 0 && windowEnd > since,
    placeholderData: keepPreviousData,
    retry: QUERY_RETRIES,
  });

  return {
    blocks: result.data ?? [],
    since,
    capped: windowStart < earliest,
    isLoading: result.isLoading,
    error: result.error,
  };
}
