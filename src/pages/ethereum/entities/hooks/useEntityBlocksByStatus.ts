import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTableBounds } from '@/hooks/useBounds';
import { useNetwork } from '@/hooks/useNetwork';
import { offsetPageToken } from '@/utils/page-token';
import { fetchNewestFirst, nowEnd } from '@/utils/widening-window';
import { entityQuery } from '@/pages/ethereum/clients/utils/client-share';
import {
  DEFAULT_BLOCK_PAGE_SIZE,
  isNewestFirst,
  parseProposers,
  parseSort,
  type BlockSearch,
} from '@/pages/ethereum/clients/utils/block-filters';

import { ENTITY_TABLES, fctBlockProposerByEntityList, type FctBlockProposerByEntity } from '../api/entity-models';

/** Proposal outcomes that leave no block on chain, so have no graffiti to filter by */
export type ProposalStatus = 'missed' | 'orphaned';

/** Columns the missed and orphaned tables sort by */
export const STATUS_SORT_FIELDS = ['slot_start_date_time', 'slot', 'proposer_validator_index'] as const;

export interface StatusBlock {
  slot: number;
  slot_start_date_time: number;
  proposer_validator_index: number;
}

export interface UseEntityBlocksByStatusResult {
  /** Rows on the current page */
  blocks: StatusBlock[];
  isLoading: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  hasNextPage: boolean;
}

/**
 * One page of an entity's missed or orphaned slots, filtered, sorted and paged server-side by the search params.
 * Newest first reads widening windows back from the range's end, skipping the earlier pages' rows; the range starts
 * no earlier than the table.
 */
export function useEntityBlocksByStatus(
  entity: string,
  status: ProposalStatus,
  search: BlockSearch
): UseEntityBlocksByStatusResult {
  const { currentNetwork } = useNetwork();
  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds(ENTITY_TABLES.proposers);
  const tableStart = Math.max(currentNetwork?.genesis_time ?? 0, tableBounds?.min ?? 0);
  const newest = isNewestFirst(search.sort, STATUS_SORT_FIELDS);
  const proposers = parseProposers(search.proposer);
  const size = search.size ?? DEFAULT_BLOCK_PAGE_SIZE;
  const { field, desc } = parseSort(search.sort, STATUS_SORT_FIELDS);
  const tieBreak = field === 'slot_start_date_time' || field === 'slot' ? '' : ',slot_start_date_time desc';
  const query = {
    ...entityQuery(entity),
    status_eq: status,
    slot_start_date_time_gte: search.since ?? tableStart,
    ...(search.until !== undefined && { slot_start_date_time_lte: search.until }),
    ...(search.slotMin !== undefined && { slot_gte: search.slotMin }),
    ...(search.slotMax !== undefined && { slot_lte: search.slotMax }),
    ...(proposers.length > 0 && { proposer_validator_index_in_values: proposers.join(',') }),
    order_by: `${field} ${desc ? 'desc' : 'asc'}${tieBreak}`,
    page_size: size,
    page_token: offsetPageToken((search.page ?? 1) - 1, size),
  };

  const result = useQuery({
    queryKey: ['entity-blocks-by-status', currentNetwork?.name, query, newest],
    queryFn: async ({ signal }) => {
      type Page = { [ENTITY_TABLES.proposers]?: FctBlockProposerByEntity[]; next_page_token?: string };
      if (!newest) {
        const response = await fctBlockProposerByEntityList({ query, signal, throwOnError: true });
        return response.data as Page;
      }
      const { page_token: _token, order_by: _order, slot_start_date_time_lte: last, ...filters } = query;
      const { rows, next } = await fetchNewestFirst<FctBlockProposerByEntity>({
        pageSize: size,
        skip: ((search.page ?? 1) - 1) * size,
        end: last !== undefined ? last + 1 : nowEnd(),
        floor: filters.slot_start_date_time_gte,
        timeOf: row => row.slot_start_date_time,
        fetchWindow: async (window, limit) => {
          const response = await fctBlockProposerByEntityList({
            query: {
              ...filters,
              slot_start_date_time_gte: window.gte,
              slot_start_date_time_lt: window.lt,
              order_by: 'slot_start_date_time desc',
              page_size: limit,
            },
            signal,
            throwOnError: true,
          });
          return (response.data as Page)[ENTITY_TABLES.proposers] ?? [];
        },
      });
      return { [ENTITY_TABLES.proposers]: rows, next_page_token: next ? 'more' : undefined } as Page;
    },
    enabled: !!currentNetwork && !!entity && !boundsLoading,
    placeholderData: keepPreviousData,
  });

  const blocks = (result.data?.[ENTITY_TABLES.proposers] ?? []).map(row => ({
    slot: row.slot ?? 0,
    slot_start_date_time: row.slot_start_date_time ?? 0,
    proposer_validator_index: row.proposer_validator_index ?? 0,
  }));
  return {
    blocks,
    isLoading: result.isLoading || boundsLoading,
    isPlaceholderData: result.isPlaceholderData,
    error: result.error as Error | null,
    hasNextPage: !!result.data?.next_page_token && blocks.length === size,
  };
}
