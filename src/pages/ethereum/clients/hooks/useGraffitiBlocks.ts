import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctBlockGraffitiServiceList } from '@/api/sdk.gen';
import type { FctBlockGraffiti } from '@/api/types.gen';
import { useTableBounds } from '@/hooks/useBounds';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchNewestFirst, nowEnd } from '@/utils/widening-window';
import { DEFAULT_BLOCK_PAGE_SIZE, graffitiBlocksQuery, isNewestFirst, type BlockSearch } from '../utils/block-filters';

export interface UseGraffitiBlocksResult {
  blocks: FctBlockGraffiti[];
  isLoading: boolean;
  /** Showing the previous page's rows while the next one loads */
  isPlaceholderData: boolean;
  error: Error | null;
  hasNextPage: boolean;
}

/** Newest first with a tie-break, so blocks of one slot keep their order across pages */
const NEWEST_FIRST_ORDER = 'slot_start_date_time desc, block_root asc';

/**
 * One page of blocks with their parsed graffiti, filtered and sorted server-side by the search params. Newest first
 * reads widening windows back from the range's end, skipping the earlier pages' rows; the range starts no earlier
 * than the table.
 */
export function useGraffitiBlocks(search: BlockSearch): UseGraffitiBlocksResult {
  const { currentNetwork } = useNetwork();
  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds('fct_block_graffiti');
  const tableStart = Math.max(currentNetwork?.genesis_time ?? 0, tableBounds?.min ?? 0);
  const query = graffitiBlocksQuery(search, tableStart);
  const newest = isNewestFirst(search.sort);
  const size = search.size ?? DEFAULT_BLOCK_PAGE_SIZE;

  const result = useQuery({
    queryKey: ['clients', 'graffiti-blocks', currentNetwork?.name, query, newest],
    queryFn: async ({ signal }) => {
      if (!newest) {
        const { data } = await fctBlockGraffitiServiceList({ query, signal, throwOnError: true });
        return { blocks: data.fct_block_graffiti ?? [], hasNextPage: !!data.next_page_token };
      }
      const { page_token: _token, order_by: _order, slot_start_date_time_lte: last, ...filters } = query;
      const { rows, next } = await fetchNewestFirst<FctBlockGraffiti>({
        pageSize: size,
        skip: ((search.page ?? 1) - 1) * size,
        end: last !== undefined ? last + 1 : nowEnd(),
        floor: filters.slot_start_date_time_gte,
        timeOf: block => block.slot_start_date_time,
        fetchWindow: async (window, limit) => {
          const { data } = await fctBlockGraffitiServiceList({
            query: {
              ...filters,
              slot_start_date_time_gte: window.gte,
              slot_start_date_time_lt: window.lt,
              order_by: NEWEST_FIRST_ORDER,
              page_size: limit,
            },
            signal,
            throwOnError: true,
          });
          return data.fct_block_graffiti ?? [];
        },
      });
      return { blocks: rows, hasNextPage: !!next };
    },
    enabled: !!currentNetwork && !boundsLoading,
    placeholderData: keepPreviousData,
  });

  const blocks = result.data?.blocks ?? [];
  return {
    blocks,
    isLoading: result.isLoading || boundsLoading,
    isPlaceholderData: result.isPlaceholderData,
    error: result.error as Error | null,
    hasNextPage: !!result.data?.hasNextPage && blocks.length === size,
  };
}
