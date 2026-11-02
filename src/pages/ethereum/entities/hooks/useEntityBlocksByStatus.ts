import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctBlockProposerEntityServiceList, fctBlockProposerServiceList } from '@/api/sdk.gen';
import type { FctBlockProposer } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import {
  DEFAULT_BLOCK_PAGE_SIZE,
  parseProposers,
  parseSort,
  type BlockSearch,
} from '@/pages/ethereum/clients/utils/block-filters';

/** Proposal outcomes that leave no block on chain, so have no graffiti to filter by */
export type ProposalStatus = 'missed' | 'orphaned';

/** Columns the missed and orphaned tables sort by */
export const STATUS_SORT_FIELDS = ['slot_start_date_time', 'slot', 'proposer_index'] as const;

export interface StatusBlock {
  slot: number;
  slot_start_date_time: number;
  proposer_index: number;
}

export interface UseEntityBlocksByStatusResult {
  /** Rows on the current page */
  blocks: StatusBlock[];
  isLoading: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  hasNextPage: boolean;
}

/** Slot times per entity lookup; each adds about 13 URL-encoded characters to a URL the proxy caps at 8 KB */
const LOOKUP_CHUNK = 400;

/**
 * An entity's missed or orphaned slots. fct_block_proposer knows the status but not the entity; such slots are rare
 * enough to fetch every one in the filtered range and keep those the entity's proposer duties cover. Sorting and
 * paging happen here since the full set is in hand.
 */
export function useEntityBlocksByStatus(
  entity: string,
  status: ProposalStatus,
  search: BlockSearch
): UseEntityBlocksByStatusResult {
  const { currentNetwork } = useNetwork();
  const proposers = parseProposers(search.proposer);
  const filters = {
    status_eq: status,
    slot_start_date_time_gte: search.since ?? currentNetwork?.genesis_time ?? 0,
    ...(search.until !== undefined && { slot_start_date_time_lte: search.until }),
    ...(search.slotMin !== undefined && { slot_gte: search.slotMin }),
    ...(search.slotMax !== undefined && { slot_lte: search.slotMax }),
    ...(proposers.length > 0 && { proposer_validator_index_in_values: proposers.join(',') }),
  };

  const query = useQuery({
    queryKey: ['entity-blocks-by-status', currentNetwork?.name, entity, filters],
    queryFn: async ({ signal }): Promise<StatusBlock[]> => {
      const rows = await fetchAllPages<FctBlockProposer>(
        fctBlockProposerServiceList,
        { query: { ...filters, page_size: 10_000 } },
        'fct_block_proposer',
        signal
      );
      const times = rows.map(row => row.slot_start_date_time).filter((time): time is number => time !== undefined);
      const owned = new Set<number>();
      const chunks = Array.from({ length: Math.ceil(times.length / LOOKUP_CHUNK) }, (_, i) =>
        times.slice(i * LOOKUP_CHUNK, (i + 1) * LOOKUP_CHUNK)
      );
      await Promise.all(
        chunks.map(async chunk => {
          const response = await fctBlockProposerEntityServiceList({
            query: { entity_eq: entity, slot_start_date_time_in_values: chunk.join(','), page_size: chunk.length },
            signal,
            throwOnError: true,
          });
          for (const row of response.data?.fct_block_proposer_entity ?? []) {
            if (row.slot_start_date_time !== undefined) owned.add(row.slot_start_date_time);
          }
        })
      );
      return rows
        .filter(row => row.slot_start_date_time !== undefined && owned.has(row.slot_start_date_time))
        .map(row => ({
          slot: row.slot ?? 0,
          slot_start_date_time: row.slot_start_date_time ?? 0,
          proposer_index: row.proposer_validator_index ?? 0,
        }));
    },
    enabled: !!currentNetwork && !!entity,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { field, desc } = parseSort(search.sort, STATUS_SORT_FIELDS);
  const key = field as keyof StatusBlock;
  const size = search.size ?? DEFAULT_BLOCK_PAGE_SIZE;
  const start = ((search.page ?? 1) - 1) * size;
  const sorted = [...(query.data ?? [])].sort(
    (a, b) => (desc ? b[key] - a[key] : a[key] - b[key]) || b.slot_start_date_time - a.slot_start_date_time
  );

  return {
    blocks: sorted.slice(start, start + size),
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    error: query.error as Error | null,
    hasNextPage: sorted.length > start + size,
  };
}
