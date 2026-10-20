import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import {
  fctBlockDataColumnCompletionServiceList,
  fctBlockPartialDataColumnHeaderFirstSeenServiceList,
} from '@/api/sdk.gen';
import type { FctBlockDataColumnCompletion, FctBlockPartialDataColumnHeaderFirstSeen } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { BLOCKS_PAGE_SIZE, QUERY_RETRIES } from '../constants';

/** A block's column completions with the first sighting of its partial column header, when it pushed one */
export interface CompletionBlock extends FctBlockDataColumnCompletion {
  header?: FctBlockPartialDataColumnHeaderFirstSeen;
}

export interface UseCompletionBlocksResult {
  blocks: CompletionBlock[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Fetches the most recent blocks with how sentry nodes completed their columns, newest first, a page at a time.
 */
export function useCompletionBlocks(since: number): UseCompletionBlocksResult {
  const { currentNetwork } = useNetwork();

  const query = useInfiniteQuery({
    queryKey: ['partial-columns', 'blocks', currentNetwork?.name, since],
    queryFn: async ({ pageParam, signal }) => {
      const response = await fctBlockDataColumnCompletionServiceList({
        query: {
          slot_start_date_time_gte: since,
          order_by: 'slot_start_date_time desc',
          page_size: BLOCKS_PAGE_SIZE,
          ...(pageParam && { page_token: pageParam }),
        },
        signal,
        throwOnError: true,
      });
      const rows = response.data?.fct_block_data_column_completion ?? [];
      const times = rows.map(row => row.slot_start_date_time ?? 0).filter(time => time > 0);
      let headers: FctBlockPartialDataColumnHeaderFirstSeen[] = [];
      if (times.length > 0) {
        // Header timings are optional context, so a failed lookup leaves the column empty instead of the table.
        const headerResponse = await fctBlockPartialDataColumnHeaderFirstSeenServiceList({
          query: {
            slot_start_date_time_gte: Math.min(...times),
            slot_start_date_time_lte: Math.max(...times),
            page_size: BLOCKS_PAGE_SIZE * 2,
          },
          signal,
        });
        headers = headerResponse.data?.fct_block_partial_data_column_header_first_seen ?? [];
      }
      const headerByRoot = new Map(headers.map(header => [header.block_root, header]));
      return {
        blocks: rows.map(row => ({ ...row, header: headerByRoot.get(row.block_root) })),
        nextPageToken: response.data?.next_page_token,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage?.nextPageToken || undefined,
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    retry: QUERY_RETRIES,
  });

  const blocks = useMemo(() => query.data?.pages.flatMap(page => page.blocks) ?? [], [query.data]);

  return {
    blocks,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  };
}
