import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctBlockGraffitiServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctBlockGraffiti } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { graffitiBlocksQuery, type BlockSearch } from '../utils/block-filters';

export interface UseGraffitiBlocksResult {
  blocks: FctBlockGraffiti[];
  isLoading: boolean;
  /** Showing the previous page's rows while the next one loads */
  isPlaceholderData: boolean;
  error: Error | null;
  hasNextPage: boolean;
}

/**
 * One page of blocks with their parsed graffiti, filtered and sorted server-side by the search params.
 */
export function useGraffitiBlocks(search: BlockSearch): UseGraffitiBlocksResult {
  const { currentNetwork } = useNetwork();
  const query = graffitiBlocksQuery(search, currentNetwork?.genesis_time ?? 0);

  const result = useQuery({
    ...fctBlockGraffitiServiceListOptions({ query }),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
  });

  const blocks = result.data?.fct_block_graffiti ?? [];
  return {
    blocks,
    isLoading: result.isLoading,
    isPlaceholderData: result.isPlaceholderData,
    error: result.error as Error | null,
    hasNextPage: !!result.data?.next_page_token && blocks.length === query.page_size,
  };
}
