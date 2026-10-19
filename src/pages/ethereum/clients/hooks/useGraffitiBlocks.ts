import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fctBlockGraffitiServiceList } from '@/api/sdk.gen';
import type { FctBlockGraffiti } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { BLOCKS_PAGE_SIZE } from '../constants';

export interface UseGraffitiBlocksOptions {
  /** Earliest slot start (unix seconds) to include */
  since: number;
  /** Only blocks whose graffiti names this consensus client */
  consensusClient?: string;
  /** Only blocks whose graffiti names this execution client */
  executionClient?: string;
}

export interface UseGraffitiBlocksResult {
  blocks: FctBlockGraffiti[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Fetches the most recent blocks with their parsed graffiti, newest first, a page at a time.
 */
export function useGraffitiBlocks({
  since,
  consensusClient,
  executionClient,
}: UseGraffitiBlocksOptions): UseGraffitiBlocksResult {
  const { currentNetwork } = useNetwork();

  const query = useInfiniteQuery({
    queryKey: ['graffiti-clients', 'blocks', currentNetwork?.name, since, consensusClient, executionClient],
    queryFn: async ({ pageParam, signal }) => {
      const response = await fctBlockGraffitiServiceList({
        query: {
          slot_start_date_time_gte: since,
          order_by: 'slot_start_date_time desc',
          page_size: BLOCKS_PAGE_SIZE,
          ...(consensusClient && { consensus_client_eq: consensusClient }),
          ...(executionClient && { execution_client_eq: executionClient }),
          ...(pageParam && { page_token: pageParam }),
        },
        signal,
        throwOnError: true,
      });
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage?.next_page_token || undefined,
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
  });

  const blocks = useMemo(() => query.data?.pages.flatMap(page => page?.fct_block_graffiti ?? []) ?? [], [query.data]);

  return {
    blocks,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  };
}
