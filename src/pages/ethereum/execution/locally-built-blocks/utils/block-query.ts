import { fctPreparedBlockServiceList } from '@/api/sdk.gen';
import type { FctPreparedBlock, FctPreparedBlockServiceListData } from '@/api/types.gen';
import { slotToTimestamp } from '@/utils/beacon';
import { fetchNewestFirst, nowEnd, type NewestFirstPage, type TimeCursor } from '@/utils/widening-window';
import type { BlockFilters, BlockSortKey } from '../IndexPage.types';

export type PreparedBlockQuery = NonNullable<FctPreparedBlockServiceListData['query']>;

/** API field behind each sortable column */
const SORT_FIELDS: Record<BlockSortKey, string> = {
  slot: 'slot_start_date_time',
  node: 'meta_client_name',
  gas: 'execution_payload_gas_used',
  txs: 'execution_payload_transactions_count',
  size: 'block_total_bytes',
};

const scale = (value: number | undefined, factor: number): number | undefined =>
  value === undefined ? undefined : Math.round(value * factor);

/**
 * API filters for prepared blocks. A slot range replaces the time window, which starts at `windowStart`: the table's
 * start for all history, undefined until it is known. The execution client only appears in the node name, so it
 * matches the name's client segment.
 */
export function preparedBlockFilters(
  filters: BlockFilters,
  windowStart: number | undefined,
  genesisTime: number
): PreparedBlockQuery {
  const query: PreparedBlockQuery = {
    slot_start_date_time_gte:
      filters.slotFrom !== undefined ? slotToTimestamp(filters.slotFrom, genesisTime) : windowStart,
    slot_start_date_time_lte: filters.slotTo !== undefined ? slotToTimestamp(filters.slotTo, genesisTime) : undefined,
    meta_client_name_ends_with: filters.node ? `/${filters.node}` : undefined,
    meta_client_name_like: filters.el ? `%-${filters.el}-%` : undefined,
    meta_consensus_implementation_eq: filters.cl,
    meta_consensus_version_contains: filters.clVersion,
    execution_payload_gas_used_gte: scale(filters.gasMin, 1_000_000),
    execution_payload_gas_used_lte: scale(filters.gasMax, 1_000_000),
    execution_payload_transactions_count_gte: filters.txsMin,
    execution_payload_transactions_count_lte: filters.txsMax,
    block_total_bytes_gte: scale(filters.sizeMin, 1024),
    block_total_bytes_lte: scale(filters.sizeMax, 1024),
  };
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as PreparedBlockQuery;
}

/** Sort order with tie-breaks on slot and node, so rows keep their place across pages */
export function preparedBlockOrder(sort: BlockSortKey, order: 'asc' | 'desc'): string {
  const keys = [`${SORT_FIELDS[sort]} ${order}`];
  if (sort !== 'slot') keys.push('slot_start_date_time desc');
  if (sort !== 'node') keys.push('meta_client_name asc');
  return keys.join(', ');
}

/**
 * One page of the newest prepared blocks matching `filters`, read through widening windows from the end of their
 * range, or now, back to its start; `cursor` continues from an earlier page.
 */
export function fetchNewestPreparedBlocks(
  filters: PreparedBlockQuery,
  pageSize: number,
  cursor: TimeCursor | undefined,
  signal?: AbortSignal
): Promise<NewestFirstPage<FctPreparedBlock>> {
  const { slot_start_date_time_gte: floor, slot_start_date_time_lte: last, ...rest } = filters;
  return fetchNewestFirst({
    pageSize,
    end: cursor?.end ?? (last !== undefined ? last + 1 : nowEnd()),
    skip: cursor?.skip,
    floor,
    timeOf: row => row.slot_start_date_time,
    fetchWindow: async (window, limit) => {
      const { data } = await fctPreparedBlockServiceList({
        query: {
          ...rest,
          slot_start_date_time_gte: window.gte,
          slot_start_date_time_lt: window.lt,
          order_by: preparedBlockOrder('slot', 'desc'),
          page_size: limit,
        },
        signal,
        throwOnError: true,
      });
      return data.fct_prepared_block ?? [];
    },
  });
}

/** Node id from a node name such as ethpandaops/mainnet/utility-mainnet-teku-erigon-001 */
export function nodeIdOf(nodeName: string | undefined): string | undefined {
  return nodeName?.split('/').pop() || undefined;
}
