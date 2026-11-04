import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { offsetPageToken } from '@/utils/page-token';
import {
  DEFAULT_BLOCK_PAGE_SIZE,
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

/** One page of an entity's missed or orphaned slots, filtered, sorted and paged server-side by the search params */
export function useEntityBlocksByStatus(
  entity: string,
  status: ProposalStatus,
  search: BlockSearch
): UseEntityBlocksByStatusResult {
  const { currentNetwork } = useNetwork();
  const proposers = parseProposers(search.proposer);
  const size = search.size ?? DEFAULT_BLOCK_PAGE_SIZE;
  const { field, desc } = parseSort(search.sort, STATUS_SORT_FIELDS);
  const tieBreak = field === 'slot_start_date_time' || field === 'slot' ? '' : ',slot_start_date_time desc';
  const query = {
    entity_eq: entity,
    status_eq: status,
    slot_start_date_time_gte: search.since ?? currentNetwork?.genesis_time ?? 0,
    ...(search.until !== undefined && { slot_start_date_time_lte: search.until }),
    ...(search.slotMin !== undefined && { slot_gte: search.slotMin }),
    ...(search.slotMax !== undefined && { slot_lte: search.slotMax }),
    ...(proposers.length > 0 && { proposer_validator_index_in_values: proposers.join(',') }),
    order_by: `${field} ${desc ? 'desc' : 'asc'}${tieBreak}`,
    page_size: size,
    page_token: offsetPageToken((search.page ?? 1) - 1, size),
  };

  const result = useQuery({
    queryKey: ['entity-blocks-by-status', currentNetwork?.name, query],
    queryFn: async ({ signal }) => {
      const response = await fctBlockProposerByEntityList({ query, signal, throwOnError: true });
      return response.data as { [ENTITY_TABLES.proposers]?: FctBlockProposerByEntity[]; next_page_token?: string };
    },
    enabled: !!currentNetwork && !!entity,
    placeholderData: keepPreviousData,
  });

  const blocks = (result.data?.[ENTITY_TABLES.proposers] ?? []).map(row => ({
    slot: row.slot ?? 0,
    slot_start_date_time: row.slot_start_date_time ?? 0,
    proposer_validator_index: row.proposer_validator_index ?? 0,
  }));
  return {
    blocks,
    isLoading: result.isLoading,
    isPlaceholderData: result.isPlaceholderData,
    error: result.error as Error | null,
    hasNextPage: !!result.data?.next_page_token && blocks.length === size,
  };
}
