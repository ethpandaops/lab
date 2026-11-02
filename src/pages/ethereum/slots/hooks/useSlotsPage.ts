import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import {
  fctBlockGraffitiServiceList,
  fctBlockHeadServiceList,
  fctBlockMevHeadServiceList,
  fctBlockPayloadPtcVoteHeadServiceList,
  fctBlockProposerEntityServiceList,
  fctBlockProposerHeadServiceList,
  fctBlockProposerServiceList,
} from '@/api/sdk.gen';
import type { SlotFilters, SlotSort } from '../IndexPage.types';
import {
  SORT_COLUMNS,
  applyRow,
  chooseDriver,
  encodeCursor,
  filterTables,
  matchesFilters,
  parseCursor,
  serverQuery,
  slotBounds,
  toSlotRow,
  type SlotFacts,
  type SlotRow,
  type SlotTable,
} from '../utils/slot-query';

/** Driver rows read per request while filters are checked here */
const SCAN_BATCH = 250;
/** Requests per page before a short page is returned with a cursor to keep searching */
const MAX_BATCHES = 8;

type ListFn = (options: {
  query: Record<string, unknown>;
  signal?: AbortSignal;
  throwOnError: true;
}) => Promise<{ data?: unknown }>;

const TABLES: Record<SlotTable, { list: ListFn; key: string }> = {
  proposer: { list: fctBlockProposerHeadServiceList as unknown as ListFn, key: 'fct_block_proposer_head' },
  status: { list: fctBlockProposerServiceList as unknown as ListFn, key: 'fct_block_proposer' },
  entity: { list: fctBlockProposerEntityServiceList as unknown as ListFn, key: 'fct_block_proposer_entity' },
  block: { list: fctBlockHeadServiceList as unknown as ListFn, key: 'fct_block_head' },
  mev: { list: fctBlockMevHeadServiceList as unknown as ListFn, key: 'fct_block_mev_head' },
  graffiti: { list: fctBlockGraffitiServiceList as unknown as ListFn, key: 'fct_block_graffiti' },
  ptc: { list: fctBlockPayloadPtcVoteHeadServiceList as unknown as ListFn, key: 'fct_block_payload_ptc_vote_head' },
};

const DISPLAY_TABLES: SlotTable[] = ['proposer', 'status', 'entity', 'block', 'mev', 'graffiti'];

async function listRows(
  table: SlotTable,
  query: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ rows: Record<string, unknown>[]; next?: string }> {
  const { list, key } = TABLES[table];
  const response = await list({ query, signal, throwOnError: true });
  const data = (response.data ?? {}) as Record<string, unknown>;
  return {
    rows: (data[key] as Record<string, unknown>[] | undefined) ?? [],
    next: (data.next_page_token as string | undefined) || undefined,
  };
}

/** Read `tables` for `slots` and merge the rows into `facts` */
async function loadFacts(
  slots: number[],
  tables: SlotTable[],
  genesisTime: number,
  facts: Map<number, SlotFacts>,
  signal?: AbortSignal
): Promise<void> {
  if (slots.length === 0 || tables.length === 0) return;
  const query = {
    slot_in_values: slots.join(','),
    slot_start_date_time_gte: slotToTimestamp(Math.min(...slots), genesisTime),
    slot_start_date_time_lte: slotToTimestamp(Math.max(...slots), genesisTime),
    page_size: slots.length * 2 + 10,
  };
  await Promise.all(
    tables.map(async table => {
      const request = listRows(table, query, signal);
      // PTC votes only exist from gloas; a network without them still lists its slots
      const { rows } = table === 'ptc' ? await request.catch(() => ({ rows: [] })) : await request;
      for (const row of rows) applyRow(table, row, facts);
    })
  );
}

export interface SlotsPageArgs {
  filters: SlotFilters;
  sort: SlotSort;
  dir: 'asc' | 'desc';
  pageSize: number;
  cursor?: string;
}

export interface SlotsPageResult {
  rows: SlotRow[];
  /** Cursor for the next page in list order, undefined at the end */
  nextCursor?: string;
  /** Cursor for the previous page, for slot order */
  prevCursor?: string;
  /** The page stopped short of `pageSize` before the end of the data; the next page keeps searching */
  partial?: boolean;
  /** For a partial page in slot order, the last slot searched */
  searchedTo?: number;
}

/**
 * One page of the slot list. Pages through the driver table (see `chooseDriver`) with its own filters applied
 * server-side, joins the tables the other filters need, and keeps reading until the page is full, the data
 * ends or `MAX_BATCHES` requests have been made.
 */
export async function fetchSlotsPage(
  { filters, sort, dir, pageSize, cursor: cursorParam }: SlotsPageArgs,
  genesisTime: number,
  withPtc: boolean,
  signal?: AbortSignal
): Promise<SlotsPageResult> {
  const driver = chooseDriver(filters, sort);
  const joins = filterTables(filters).filter(table => table !== driver);
  const batchSize = joins.length > 0 ? SCAN_BATCH : pageSize;
  const bounds = slotBounds(filters, genesisTime);
  const cursor = parseCursor(cursorParam);
  const facts = new Map<number, SlotFacts>();
  const matched: SlotFacts[] = [];
  const base = serverQuery(driver, filters);
  // The MEV table trails the block table by a few slots; blocks past it are not yet known to be local
  const mevLatest = listRows(
    'mev',
    { slot_start_date_time_gte: genesisTime, order_by: 'slot desc', page_size: 1 },
    signal
  )
    .then(({ rows }) => (typeof rows[0]?.slot === 'number' ? rows[0].slot : -1))
    .catch(() => Number.POSITIVE_INFINITY);
  const mevCoveredTo = filters.source === 'local' ? await mevLatest : Infinity;
  const passes = (slot: number): boolean => matchesFilters(facts.get(slot)!, filters, mevCoveredTo);

  let lo = bounds.min ?? 0;
  let hi = bounds.max ?? Number.POSITIVE_INFINITY;
  const timeQuery = (): Record<string, number> => ({
    slot_start_date_time_gte: slotToTimestamp(lo, genesisTime),
    ...(Number.isFinite(hi) && { slot_start_date_time_lte: slotToTimestamp(hi, genesisTime) }),
  });

  /** Fetch one driver batch, join it, and add the slots that pass every filter; returns the slots read */
  const readBatch = async (query: Record<string, unknown>): Promise<{ slots: number[]; next?: string }> => {
    const { rows, next } = await listRows(driver, { ...base, ...timeQuery(), ...query, page_size: batchSize }, signal);
    const slots: number[] = [];
    for (const row of rows) {
      applyRow(driver, row, facts);
      if (typeof row.slot === 'number' && slots[slots.length - 1] !== row.slot) slots.push(row.slot);
    }
    await loadFacts(slots, joins, genesisTime, facts, signal);
    return { slots, next: rows.length < batchSize ? undefined : (next ?? 'more') };
  };

  let result: Omit<SlotsPageResult, 'rows'>;

  if (sort === 'slot') {
    const ascending = cursor?.kind === 'after';
    if (cursor?.kind === 'before') hi = Math.min(hi, cursor.slot - 1);
    if (cursor?.kind === 'after') lo = Math.max(lo, cursor.slot + 1);
    const start = ascending ? lo : hi;
    let last: number | undefined;
    let exhausted = false;

    for (let batch = 0; batch < MAX_BATCHES && matched.length < pageSize; batch++) {
      if (lo > hi) {
        exhausted = true;
        break;
      }
      const { slots, next } = await readBatch({ order_by: `slot ${ascending ? 'asc' : 'desc'}` });
      for (const slot of slots) {
        last = slot;
        if (passes(slot)) matched.push(facts.get(slot)!);
        if (matched.length === pageSize) break;
      }
      if (matched.length === pageSize) break;
      if (!next || last === undefined) {
        exhausted = true;
        break;
      }
      if (ascending) lo = last + 1;
      else hi = last - 1;
    }

    const full = matched.length === pageSize;
    const first = matched[0]?.slot;
    if (ascending) {
      // Read upwards from an older page; shown newest first
      matched.reverse();
      result = {
        nextCursor: encodeCursor({ kind: 'before', slot: first ?? start }),
        prevCursor: !full && exhausted ? undefined : encodeCursor({ kind: 'after', slot: last ?? start }),
      };
    } else {
      result = {
        nextCursor: exhausted || last === undefined ? undefined : encodeCursor({ kind: 'before', slot: last }),
        prevCursor: encodeCursor({ kind: 'after', slot: first ?? (Number.isFinite(start) ? start : 0) }),
        partial: !full && !exhausted,
        searchedTo: !full && !exhausted ? last : undefined,
      };
    }
  } else {
    let token = cursor?.kind === 'token' ? cursor.token : undefined;
    let skip = cursor?.kind === 'token' ? cursor.skip : 0;
    let nextCursor: string | undefined;
    let partial = false;

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const { slots, next } = await readBatch({
        order_by: `${SORT_COLUMNS[sort]} ${dir}, slot desc`,
        ...(token && { page_token: token }),
      });
      const realNext = next === 'more' ? undefined : next;
      let index = skip;
      for (; index < slots.length && matched.length < pageSize; index++) {
        if (passes(slots[index])) matched.push(facts.get(slots[index])!);
      }
      if (matched.length === pageSize) {
        nextCursor =
          index < slots.length
            ? encodeCursor({ kind: 'token', token, skip: index })
            : realNext
              ? encodeCursor({ kind: 'token', token: realNext, skip: 0 })
              : undefined;
        break;
      }
      if (!realNext) break;
      token = realNext;
      skip = 0;
      if (batch === MAX_BATCHES - 1) {
        nextCursor = encodeCursor({ kind: 'token', token, skip: 0 });
        partial = true;
      }
    }
    result = { nextCursor, partial };
  }

  const shown = matched.map(entry => entry.slot);
  const missing = DISPLAY_TABLES.filter(table => table !== driver && !joins.includes(table));
  const [coveredTo] = await Promise.all([
    mevLatest,
    loadFacts(shown, withPtc ? [...missing, 'ptc'] : missing, genesisTime, facts, signal),
  ]);

  return { ...result, rows: matched.map(entry => toSlotRow(facts.get(entry.slot)!, genesisTime, coveredTo)) };
}

export interface UseSlotsPageReturn {
  data: SlotsPageResult | undefined;
  isLoading: boolean;
  /** True while another page loads and the previous one is still shown */
  isPlaceholderData: boolean;
  isFetching: boolean;
  error: Error | null;
}

/**
 * One page of slots for the given filters, sort and cursor. The newest page follows the chain head.
 */
export function useSlotsPage(args: SlotsPageArgs, withPtc: boolean): UseSlotsPageReturn {
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time;
  const followsHead =
    args.sort === 'slot' && !args.cursor && args.filters.slotMax === undefined && !args.filters.timeEnd;

  const query = useQuery({
    queryKey: ['slots-list', currentNetwork?.name, args, withPtc],
    queryFn: ({ signal }) => fetchSlotsPage(args, genesisTime!, withPtc, signal),
    enabled: genesisTime !== undefined,
    placeholderData: keepPreviousData,
    refetchInterval: followsHead ? 12_000 : false,
    staleTime: followsHead ? 0 : 60_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    isFetching: query.isFetching,
    error: query.error,
  };
}
