import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctPreparedBlockServiceList } from '@/api/sdk.gen';
import type { FctPreparedBlock } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { offsetPageToken } from '@/utils/page-token';
import { encodeTimeCursor, parseTimeCursor } from '@/utils/widening-window';
import type { BlockSortKey } from '@/pages/ethereum/execution/locally-built-blocks/IndexPage.types';
import {
  type PreparedBlockQuery,
  fetchNewestPreparedBlocks,
  preparedBlockOrder,
} from '@/pages/ethereum/execution/locally-built-blocks/utils/block-query';

export interface UsePreparedBlocksResult {
  blocks: FctPreparedBlock[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  /** Cursor of the next page, newest first only */
  nextCursor?: string;
}

/** Refresh interval while the first page shows the newest blocks, one slot */
const LIVE_REFETCH_MS = 12_000;

/**
 * One page of locally built blocks matching the filters, sorted by the API. Newest first pages by `cursor` through
 * widening windows; other sorts page by offset through `page`, so need a bounded range. The first page of the newest
 * blocks refreshes every slot when the query has no upper bound and `canRefresh` allows it.
 */
export function usePreparedBlocks(
  filters: PreparedBlockQuery,
  sort: BlockSortKey,
  order: 'asc' | 'desc',
  page: number,
  pageSize: number,
  cursor: string | undefined,
  canRefresh = true
): UsePreparedBlocksResult {
  const newest = sort === 'slot' && order === 'desc';
  const live = canRefresh && page === 0 && newest && !filters.slot_start_date_time_lte;
  const { currentNetwork } = useNetwork();
  const { data, error, isLoading } = useQuery({
    queryKey: [
      'locally-built-blocks',
      'blocks',
      currentNetwork?.name,
      filters,
      sort,
      order,
      newest ? cursor : page,
      pageSize,
    ],
    queryFn: async ({ signal }) => {
      if (newest) {
        const { rows, next } = await fetchNewestPreparedBlocks(filters, pageSize, parseTimeCursor(cursor), signal);
        return { blocks: rows, nextCursor: next && encodeTimeCursor(next), hasNextPage: !!next };
      }
      const { data } = await fctPreparedBlockServiceList({
        query: {
          ...filters,
          order_by: preparedBlockOrder(sort, order),
          page_size: pageSize,
          page_token: offsetPageToken(page, pageSize),
        },
        signal,
        throwOnError: true,
      });
      return { blocks: data.fct_prepared_block ?? [], nextCursor: undefined, hasNextPage: !!data.next_page_token };
    },
    enabled: !!currentNetwork && filters.slot_start_date_time_gte !== undefined,
    placeholderData: keepPreviousData,
    refetchInterval: live ? LIVE_REFETCH_MS : false,
  });

  return {
    blocks: data?.blocks ?? [],
    isLoading,
    error: error as Error | null,
    hasNextPage: !!data?.hasNextPage,
    nextCursor: data?.nextCursor,
  };
}
