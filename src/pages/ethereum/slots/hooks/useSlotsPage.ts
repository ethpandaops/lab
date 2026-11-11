import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { useBounds } from '@/hooks/useBounds';
import { slotToTimestamp, timestampToSlot } from '@/utils/beacon';
import { fetchWidening, nowEnd, wideningWindows } from '@/utils/widening-window';
import {
  fctBlockGraffitiServiceList,
  fctBlockHeadServiceList,
  fctBlockMevHeadServiceList,
  fctBlockPayloadPtcVoteHeadServiceList,
  fctBlockProposerEntityServiceList,
  fctBlockProposerHeadServiceList,
  fctBlockProposerServiceList,
  fctBlockServiceList,
  intBlockProposerCanonicalServiceList,
} from '@/api/sdk.gen';
import type { SlotFilters, SlotSort } from '@/pages/ethereum/slots/IndexPage.types';
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
  VALUE_SORT_SECONDS,
  toSlotRow,
  type SlotFacts,
  type SlotRow,
  type SlotTable,
} from '@/pages/ethereum/slots/utils/slot-query';

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
  canonical: { list: intBlockProposerCanonicalServiceList as unknown as ListFn, key: 'int_block_proposer_canonical' },
  status: { list: fctBlockProposerServiceList as unknown as ListFn, key: 'fct_block_proposer' },
  entity: { list: fctBlockProposerEntityServiceList as unknown as ListFn, key: 'fct_block_proposer_entity' },
  block: { list: fctBlockHeadServiceList as unknown as ListFn, key: 'fct_block_head' },
  final: { list: fctBlockServiceList as unknown as ListFn, key: 'fct_block' },
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

/**
 * Read `tables` for `slots` and merge the rows into `facts`. Blocks of slots up to `finalTo` come from fct_block,
 * whose finalized payloads have transaction counts that fct_block_head is missing for some slots.
 */
async function loadFacts(
  slots: number[],
  tables: SlotTable[],
  genesisTime: number,
  facts: Map<number, SlotFacts>,
  signal?: AbortSignal,
  finalTo?: number
): Promise<void> {
  if (slots.length === 0 || tables.length === 0) return;
  const reads = tables.flatMap((table): [SlotTable, number[]][] =>
    table === 'block' && finalTo !== undefined
      ? [
          ['final', slots.filter(slot => slot <= finalTo)],
          ['block', slots.filter(slot => slot > finalTo)],
        ]
      : [[table, slots]]
  );
  await Promise.all(
    reads.map(async ([table, ids]) => {
      if (ids.length === 0) return;
      const query = {
        slot_in_values: ids.join(','),
        slot_start_date_time_gte: slotToTimestamp(Math.min(...ids), genesisTime),
        slot_start_date_time_lte: slotToTimestamp(Math.max(...ids), genesisTime),
        page_size: ids.length * 2 + 10,
      };
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
 *
 * `headStart` is the first slot of fct_block_proposer_head. In slot order, slots before it are read from
 * int_block_proposer_canonical instead of the proposer and status tables, so the list reaches genesis.
 * `finalTo` is the last slot of fct_block; blocks up to it are shown from there (see `loadFacts`).
 * `tableStarts` holds each table's first time from `/bounds`, by table name.
 *
 * Slot order reads each batch through widening windows from where the page starts, never the whole range at once.
 * Value sorts read every row of their range, so without a slot or time range they cover the last `VALUE_SORT_SECONDS`.
 */
export async function fetchSlotsPage(
  { filters, sort, dir, pageSize, cursor: cursorParam }: SlotsPageArgs,
  genesisTime: number,
  withPtc: boolean,
  headStart?: number,
  finalTo?: number,
  tableStarts: Record<string, number | undefined> = {},
  signal?: AbortSignal
): Promise<SlotsPageResult> {
  const driver = chooseDriver(filters, sort);
  const joins = filterTables(filters).filter(table => table !== driver);
  const bounds = slotBounds(filters, genesisTime);
  const cursor = parseCursor(cursorParam);
  const facts = new Map<number, SlotFacts>();
  const matched: SlotFacts[] = [];
  // The canonical table has no orphaned blocks, so an orphaned search ends where the status table does
  const split =
    sort === 'slot' &&
    headStart !== undefined &&
    (driver === 'proposer' || (driver === 'status' && filters.status !== 'orphaned'))
      ? headStart
      : undefined;
  // The MEV table trails the block table by a few slots; blocks past it are not yet known to be local
  const mevLatest = fetchWidening(wideningWindows(nowEnd(), tableStarts[TABLES.mev.key]), 1, async window => {
    const { rows } = await listRows(
      'mev',
      { slot_start_date_time_gte: window.gte, slot_start_date_time_lt: window.lt, order_by: 'slot desc', page_size: 1 },
      signal
    );
    return rows;
  })
    .then(({ rows }) => (typeof rows[0]?.slot === 'number' ? rows[0].slot : -1))
    .catch(() => Number.POSITIVE_INFINITY);
  const mevCoveredTo = filters.source === 'local' ? await mevLatest : Infinity;
  const passes = (slot: number): boolean => matchesFilters(facts.get(slot)!, filters, mevCoveredTo);

  const recentOnly = sort !== 'slot' && bounds.min === undefined && bounds.max === undefined;
  let lo = bounds.min ?? (recentOnly ? Math.max(0, timestampToSlot(nowEnd() - VALUE_SORT_SECONDS, genesisTime)) : 0);
  // Orphaned blocks are only known from the head table's first slot on
  if (filters.status === 'orphaned' && headStart !== undefined) lo = Math.max(lo, headStart);
  let hi = bounds.max ?? Number.POSITIVE_INFINITY;

  /**
   * Fetch one batch of `table` in slots `from` to `to`, and join it; returns the slots read. The canonical table
   * stands in for the status table, whose status is then taken from the block root.
   */
  const readBatch = async (
    table: SlotTable,
    from: number,
    to: number,
    query: Record<string, unknown>
  ): Promise<{ slots: number[]; next?: string }> => {
    const tableJoins = table === 'canonical' ? joins.filter(join => join !== 'status') : joins;
    const batchSize = tableJoins.length > 0 || (table === 'canonical' && filters.status) ? SCAN_BATCH : pageSize;
    const base = { ...serverQuery(table, filters), ...query, page_size: batchSize };
    let rows: Record<string, unknown>[];
    let next: string | undefined;
    if (sort === 'slot') {
      // From the page's edge outwards: down from `to` (or now) newest first, up from `from` oldest first
      const floor = Math.max(slotToTimestamp(from, genesisTime), tableStarts[TABLES[table].key] ?? 0);
      const end = Number.isFinite(to) ? slotToTimestamp(to, genesisTime) + 1 : nowEnd();
      const windows = query.order_by === 'slot asc' ? wideningWindows(floor, end, 'asc') : wideningWindows(end, floor);
      ({ rows } = await fetchWidening(windows, batchSize, async window => {
        const page = await listRows(
          table,
          { ...base, slot_start_date_time_gte: window.gte, slot_start_date_time_lt: window.lt },
          signal
        );
        return page.rows;
      }));
    } else {
      ({ rows, next } = await listRows(
        table,
        {
          ...base,
          slot_start_date_time_gte: slotToTimestamp(from, genesisTime),
          ...(Number.isFinite(to) && { slot_start_date_time_lte: slotToTimestamp(to, genesisTime) }),
        },
        signal
      ));
    }
    const slots: number[] = [];
    for (const row of rows) {
      applyRow(table, row, facts);
      if (typeof row.slot === 'number' && slots[slots.length - 1] !== row.slot) slots.push(row.slot);
    }
    await loadFacts(slots, tableJoins, genesisTime, facts, signal, finalTo);
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
      // Each read stays on one side of the split
      const below = split !== undefined && (ascending ? lo < split : hi < split);
      const { slots, next } = await readBatch(
        below ? 'canonical' : driver,
        split !== undefined && !below ? Math.max(lo, split) : lo,
        split !== undefined && below ? Math.min(hi, split - 1) : hi,
        { order_by: `slot ${ascending ? 'asc' : 'desc'}` }
      );
      for (const slot of slots) {
        last = slot;
        if (passes(slot)) matched.push(facts.get(slot)!);
        if (matched.length === pageSize) break;
      }
      if (matched.length === pageSize) break;
      if (!next || last === undefined) {
        // One side is done; carry on across the split if the range reaches past it
        if (split !== undefined && (ascending ? below && hi >= split : !below && lo < split)) {
          if (ascending) lo = split;
          else hi = split - 1;
          continue;
        }
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
      const { slots, next } = await readBatch(driver, lo, hi, {
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
  // Value sorts page through fct_block_head; finalized rows still show their block from fct_block
  const finalShown = driver === 'block' && finalTo !== undefined ? shown.filter(slot => slot <= finalTo) : [];
  const [coveredTo] = await Promise.all([
    mevLatest,
    loadFacts(shown, withPtc ? [...missing, 'ptc'] : missing, genesisTime, facts, signal, finalTo),
    loadFacts(finalShown, ['final'], genesisTime, facts, signal),
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
  const { data: allBounds, isLoading: boundsLoading } = useBounds();
  const headBounds = allBounds?.fct_block_proposer_head;
  const finalBounds = allBounds?.fct_block;
  const headStart =
    headBounds && genesisTime !== undefined ? Math.max(0, timestampToSlot(headBounds.min, genesisTime)) : undefined;
  const finalTo = finalBounds && genesisTime !== undefined ? timestampToSlot(finalBounds.max, genesisTime) : undefined;
  const tableStarts = Object.fromEntries(Object.values(TABLES).map(({ key }) => [key, allBounds?.[key]?.min]));
  const followsHead =
    args.sort === 'slot' && !args.cursor && args.filters.slotMax === undefined && !args.filters.timeEnd;

  const query = useQuery({
    queryKey: ['slots-list', currentNetwork?.name, args, withPtc, headStart, finalTo, tableStarts],
    queryFn: ({ signal }) => fetchSlotsPage(args, genesisTime!, withPtc, headStart, finalTo, tableStarts, signal),
    enabled: genesisTime !== undefined && !boundsLoading,
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
