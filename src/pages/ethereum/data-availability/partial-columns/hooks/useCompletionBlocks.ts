import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctBlockDataColumnCompletionServiceList,
  fctBlockPartialDataColumnHeaderFirstSeenServiceList,
} from '@/api/sdk.gen';
import type {
  FctBlockDataColumnCompletion,
  FctBlockDataColumnCompletionServiceListData,
  FctBlockPartialDataColumnHeaderFirstSeen,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import { offsetPageToken } from '@/utils/page-token';
import { QUERY_RETRIES } from '../constants';
import type { BlockFilters, BlockSortKey, FilterPath } from '../IndexPage.types';

/** A block's column completions with the first sighting of its partial column header, when it pushed one */
export interface CompletionBlock extends FctBlockDataColumnCompletion {
  header?: FctBlockPartialDataColumnHeaderFirstSeen;
}

export interface CompletionBlocksQuery {
  /** Window start in unix seconds, used unless the filters give a start slot */
  since: number;
  filters: BlockFilters;
  sort: BlockSortKey;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface UseCompletionBlocksResult {
  blocks: CompletionBlock[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  hasNextPage: boolean;
}

type CompletionQuery = NonNullable<FctBlockDataColumnCompletionServiceListData['query']>;

/** API field behind each sortable column */
const SORT_FIELDS: Record<BlockSortKey, keyof FctBlockDataColumnCompletion> = {
  slot: 'slot_start_date_time',
  blob_count: 'blob_count',
  completion_count: 'completion_count',
  p50: 'p50_completion_slot_start_diff',
  p90: 'p90_completion_slot_start_diff',
  node_done: 'p50_node_last_completion_slot_start_diff',
  last: 'max_completion_slot_start_diff',
};

/** Count field per filterable path, a block used the path when it is at least one */
const PATH_FIELDS: Record<FilterPath, keyof CompletionQuery> = {
  PARTIAL_GOSSIP: 'partial_gossip_completion_count_gte',
  EL: 'el_completion_count_gte',
  RECONSTRUCTION: 'reconstruction_completion_count_gte',
};

const toMs = (seconds: number | undefined): number | undefined =>
  seconds === undefined ? undefined : Math.round(seconds * 1000);

/** API query for a page of blocks: filters, sort with a slot tie-break so pages never overlap, and page token */
export function completionBlocksQuery(
  { since, filters, sort, order, page, pageSize }: CompletionBlocksQuery,
  genesisTime: number
): CompletionQuery {
  const query: CompletionQuery = {
    slot_start_date_time_gte: filters.slotFrom !== undefined ? slotToTimestamp(filters.slotFrom, genesisTime) : since,
    slot_start_date_time_lte: filters.slotTo !== undefined ? slotToTimestamp(filters.slotTo, genesisTime) : undefined,
    blob_count_gte: filters.blobsMin,
    blob_count_lte: filters.blobsMax,
    // The API ignores filters on its percentile columns, so latency filters use the latest completion.
    max_completion_slot_start_diff_gte: toMs(filters.lastMin),
    max_completion_slot_start_diff_lte: toMs(filters.lastMax),
    order_by:
      sort === 'slot' ? `slot_start_date_time ${order}` : `${SORT_FIELDS[sort]} ${order}, slot_start_date_time desc`,
    page_size: pageSize,
    page_token: offsetPageToken(page, pageSize),
  };
  for (const path of filters.via ?? []) Object.assign(query, { [PATH_FIELDS[path]]: 1 });
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as CompletionQuery;
}

/**
 * One page of blocks with how sentry nodes completed their columns, filtered and sorted by the API.
 */
export function useCompletionBlocks(params: CompletionBlocksQuery): UseCompletionBlocksResult {
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time ?? 0;
  const query = completionBlocksQuery(params, genesisTime);

  const result = useQuery({
    queryKey: ['partial-columns', 'blocks', currentNetwork?.name, query],
    queryFn: async ({ signal }) => {
      const response = await fctBlockDataColumnCompletionServiceList({ query, signal, throwOnError: true });
      const rows = response.data?.fct_block_data_column_completion ?? [];
      const times = [...new Set(rows.map(row => row.slot_start_date_time ?? 0).filter(time => time > 0))];
      let headers: FctBlockPartialDataColumnHeaderFirstSeen[] = [];
      if (times.length > 0) {
        // Header timings are optional context, so a failed lookup leaves the column empty instead of the table.
        const headerResponse = await fctBlockPartialDataColumnHeaderFirstSeenServiceList({
          query: { slot_start_date_time_in_values: times.join(','), page_size: times.length * 2 },
          signal,
        });
        headers = headerResponse.data?.fct_block_partial_data_column_header_first_seen ?? [];
      }
      const headerByRoot = new Map(headers.map(header => [header.block_root, header]));
      return {
        blocks: rows.map(row => ({ ...row, header: headerByRoot.get(row.block_root) })),
        hasNextPage: !!response.data?.next_page_token,
      };
    },
    enabled: !!currentNetwork && (query.slot_start_date_time_gte ?? 0) > 0,
    placeholderData: keepPreviousData,
    retry: QUERY_RETRIES,
  });

  return {
    blocks: result.data?.blocks ?? [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    hasNextPage: result.data?.hasNextPage ?? false,
  };
}
