import type { IntEngineNewPayloadServiceListData } from '@/api/types.gen';
import { slotToTimestamp } from '@/utils/beacon';
import type { TimeWindow } from '@/utils/widening-window';
import type { PayloadsSearch } from '../IndexPage.types';

export type PayloadQuery = NonNullable<IntEngineNewPayloadServiceListData['query']>;

/** Order of the newest-first sort, the page default; the node breaks ties within a slot so pages keep their rows */
export const NEWEST_FIRST_ORDER = 'slot desc, meta_client_name asc';

/**
 * API filters for payload observations from the URL, without time bounds, sort or paging, so every sort and window
 * shares them.
 */
export function payloadFilters(search: PayloadsSearch, durationMin: number, referenceNodes: boolean): PayloadQuery {
  return {
    duration_ms_gte: durationMin,
    ...(search.status &&
      (search.status.includes(',') ? { status_in_values: search.status } : { status_eq: search.status })),
    ...(search.elClient &&
      (search.elClient.includes(',')
        ? { meta_execution_implementation_in_values: search.elClient }
        : { meta_execution_implementation_eq: search.elClient })),
    ...(search.slot && { slot_eq: search.slot }),
    ...(search.blockNumber && { block_number_eq: search.blockNumber }),
    ...(search.gasUsedMin && { gas_used_gte: search.gasUsedMin }),
    ...(search.txCountMin && { tx_count_gte: search.txCountMin }),
    ...(referenceNodes && { node_class_eq: 'eip7870-block-builder' }),
  };
}

/** One page of `filters` in `window`, sorted by `orderBy` */
export function payloadWindowQuery(
  filters: PayloadQuery,
  window: TimeWindow,
  orderBy: string,
  pageSize: number
): PayloadQuery {
  return {
    ...filters,
    slot_start_date_time_gte: window.gte,
    slot_start_date_time_lt: window.lt,
    order_by: orderBy,
    page_size: pageSize,
  };
}

/**
 * Time bounds of the newest-first read, unix seconds: from `floor` up to `end` (exclusive), or up to now without an
 * `end`. A slot filter reads its slot's second. A block number filter reads the whole table, whose start is
 * `tableStart`; otherwise the URL's time range, clamped to the table.
 */
export function payloadTimeBounds(
  search: PayloadsSearch,
  genesisTime: number,
  tableStart: number | undefined
): { floor: number | undefined; end: number | undefined } {
  if (search.slot) {
    const time = slotToTimestamp(search.slot, genesisTime);
    return { floor: time, end: time + 1 };
  }
  if (search.blockNumber !== undefined) return { floor: tableStart, end: undefined };
  const floor =
    search.timeStart !== undefined && tableStart !== undefined
      ? Math.max(search.timeStart, tableStart)
      : (search.timeStart ?? tableStart);
  return { floor, end: search.timeEnd !== undefined ? search.timeEnd + 1 : undefined };
}
