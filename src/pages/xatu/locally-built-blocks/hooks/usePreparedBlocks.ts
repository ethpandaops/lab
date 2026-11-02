import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctPreparedBlockServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctPreparedBlock } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { offsetPageToken } from '@/utils/page-token';
import type { BlockSortKey } from '../IndexPage.types';
import { type PreparedBlockQuery, preparedBlockOrder } from '../utils/block-query';

export interface UsePreparedBlocksResult {
  blocks: FctPreparedBlock[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
}

/** Refresh interval while the first page shows the newest blocks, one slot */
const LIVE_REFETCH_MS = 12_000;

/**
 * One page of locally built blocks matching the filters, sorted by the API. The first page of the newest blocks
 * refreshes every slot when the query has no upper bound.
 */
export function usePreparedBlocks(
  filters: PreparedBlockQuery,
  sort: BlockSortKey,
  order: 'asc' | 'desc',
  page: number,
  pageSize: number
): UsePreparedBlocksResult {
  const live = page === 0 && sort === 'slot' && order === 'desc' && !filters.slot_start_date_time_lte;
  const { currentNetwork } = useNetwork();
  const { data, error, isLoading } = useQuery({
    ...fctPreparedBlockServiceListOptions({
      query: {
        ...filters,
        order_by: preparedBlockOrder(sort, order),
        page_size: pageSize,
        page_token: offsetPageToken(page, pageSize),
      },
    }),
    enabled: !!currentNetwork && !!filters.slot_start_date_time_gte,
    placeholderData: keepPreviousData,
    refetchInterval: live ? LIVE_REFETCH_MS : false,
  });

  return {
    blocks: data?.fct_prepared_block ?? [],
    isLoading,
    error: error as Error | null,
    hasNextPage: !!data?.next_page_token,
  };
}
