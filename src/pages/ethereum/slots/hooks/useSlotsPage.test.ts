import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SlotFilters, SlotSort } from '../IndexPage.types';
import { GAS_PER_BLOB } from '../utils/slot-query';
import { fetchSlotsPage, type SlotsPageArgs } from './useSlotsPage';

type Row = Record<string, unknown> & { slot: number; slot_start_date_time: number };

/** In-memory tables standing in for the API; genesis is 0 so a slot starts at slot * 12 */
const tables: Record<string, Row[]> = {};
const FIRST = 1000;
const LAST = 3999;
let mevUntil = LAST;

const isMissed = (slot: number): boolean => slot % 10 === 3;
const isMev = (slot: number): boolean => !isMissed(slot) && slot % 3 === 0 && slot <= mevUntil;
const entityOf = (slot: number): string => (slot % 5 === 0 ? 'lido' : 'kiln');
const gasOf = (slot: number): number => ((slot * 37) % 30) * 1_000_000;
const clOf = (slot: number): string => (slot % 4 === 0 ? 'teku' : 'lighthouse');

function buildTables(): void {
  const slots = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
  const at = (slot: number): Row => ({ slot, slot_start_date_time: slot * 12 });
  tables.fct_block_proposer_head = slots.map(slot => ({
    ...at(slot),
    proposer_validator_index: slot % 7,
    block_root: isMissed(slot) ? null : `0x${slot}`,
  }));
  tables.int_block_proposer_canonical = tables.fct_block_proposer_head;
  tables.fct_block_proposer = slots.map(slot => ({ ...at(slot), status: isMissed(slot) ? 'missed' : 'canonical' }));
  tables.fct_block_proposer_entity = slots.map(slot => ({ ...at(slot), entity: entityOf(slot) }));
  const blocks = slots.filter(slot => !isMissed(slot));
  tables.fct_block_head = blocks.map(slot => ({
    ...at(slot),
    execution_payload_gas_used: gasOf(slot),
    execution_payload_blob_gas_used: (slot % 7) * GAS_PER_BLOB,
    execution_payload_transactions_count: slot % 11,
  }));
  // Finalized blocks, with an orphaned block beside the canonical one in slots ending in 5
  tables.fct_block = blocks.flatMap(slot => [
    ...(slot % 10 === 5 ? [{ ...at(slot), status: 'orphaned', execution_payload_transactions_count: 0 }] : []),
    { ...at(slot), status: 'canonical', execution_payload_transactions_count: 100 + (slot % 11) },
  ]);
  tables.fct_block_mev_head = blocks
    .filter(isMev)
    .map(slot => ({ ...at(slot), relay_names: [slot % 2 === 0 ? 'Aestus' : 'Flashbots'], builder_pubkey: '0xb' }));
  tables.fct_block_graffiti = blocks.map(slot => ({
    ...at(slot),
    consensus_client: clOf(slot),
    execution_client: 'geth',
  }));
  tables.fct_block_payload_ptc_vote_head = [];
}

/** Applies the subset of the API's filter grammar the page uses */
function list(table: string) {
  return async ({ query }: { query: Record<string, string | number> }) => {
    let rows = [...tables[table]];
    for (const [key, raw] of Object.entries(query)) {
      const match = /^(.*)_(eq|gte|lte|in_values|has|ends_with|contains)$/.exec(key);
      if (!match) continue;
      const [, field, op] = match;
      const set = op === 'in_values' ? new Set(String(raw).split(',').map(Number)) : undefined;
      rows = rows.filter(row => {
        const value = row[field] as number | string | string[];
        if (op === 'eq') return value === raw;
        if (op === 'gte') return (value as number) >= Number(raw);
        if (op === 'lte') return (value as number) <= Number(raw);
        if (set) return set.has(value as number);
        if (op === 'has') return (value as string[]).includes(String(raw));
        if (op === 'contains') return String(value).includes(String(raw));
        return String(value).endsWith(String(raw));
      });
    }
    const order = String(query.order_by ?? 'slot desc')
      .split(',')
      .map(part => part.trim().split(' '));
    rows.sort((a, b) => {
      for (const [field, dir] of order) {
        const diff = (a[field] as number) - (b[field] as number);
        if (diff !== 0) return dir === 'desc' ? -diff : diff;
      }
      return 0;
    });
    const offset = Number(query.page_token ?? 0);
    const size = Number(query.page_size);
    const page = rows.slice(offset, offset + size);
    const next = offset + size < rows.length ? String(offset + size) : undefined;
    return { data: { [table]: page, next_page_token: next } };
  };
}

vi.mock('@/api/sdk.gen', () => ({
  fctBlockProposerHeadServiceList: list('fct_block_proposer_head'),
  fctBlockProposerServiceList: list('fct_block_proposer'),
  fctBlockProposerEntityServiceList: list('fct_block_proposer_entity'),
  fctBlockHeadServiceList: list('fct_block_head'),
  fctBlockServiceList: list('fct_block'),
  fctBlockMevHeadServiceList: list('fct_block_mev_head'),
  fctBlockGraffitiServiceList: list('fct_block_graffiti'),
  fctBlockPayloadPtcVoteHeadServiceList: list('fct_block_payload_ptc_vote_head'),
  intBlockProposerCanonicalServiceList: list('int_block_proposer_canonical'),
}));

/** Every page from the first, following next cursors */
async function allPages(args: Omit<SlotsPageArgs, 'cursor'>, headStart?: number): Promise<number[][]> {
  const pages: number[][] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchSlotsPage({ ...args, cursor }, 0, false, headStart);
    pages.push(page.rows.map(row => row.slot));
    cursor = page.nextCursor;
  } while (cursor && pages.length < 1000);
  return pages;
}

const slotsWhere = (predicate: (slot: number) => boolean): number[] =>
  Array.from({ length: LAST - FIRST + 1 }, (_, i) => LAST - i).filter(predicate);

const args = (filters: SlotFilters, sort: SlotSort = 'slot', pageSize = 25): Omit<SlotsPageArgs, 'cursor'> => ({
  filters,
  sort,
  dir: 'desc',
  pageSize,
});

describe('fetchSlotsPage', () => {
  beforeEach(() => {
    mevUntil = LAST;
    buildTables();
  });

  it('pages through every slot newest first, and Previous returns the page before', async () => {
    const first = await fetchSlotsPage({ ...args({}), cursor: undefined }, 0, false);
    expect(first.rows.map(r => r.slot)).toEqual(slotsWhere(() => true).slice(0, 25));
    const second = await fetchSlotsPage({ ...args({}), cursor: first.nextCursor }, 0, false);
    expect(second.rows[0].slot).toBe(LAST - 25);
    const third = await fetchSlotsPage({ ...args({}), cursor: second.nextCursor }, 0, false);
    const back = await fetchSlotsPage({ ...args({}), cursor: third.prevCursor }, 0, false);
    expect(back.rows.map(r => r.slot)).toEqual(second.rows.map(r => r.slot));

    expect((await allPages(args({}))).flat()).toEqual(slotsWhere(() => true));
  });

  it('joins filters across tables without skipping or repeating slots between pages', async () => {
    const filters: SlotFilters = { entity: 'lido', source: 'local', cl: 'teku' };
    const expected = slotsWhere(s => entityOf(s) === 'lido' && !isMissed(s) && !isMev(s) && clOf(s) === 'teku');
    expect(expected.length).toBeGreaterThan(3);
    expect((await allPages(args(filters, 'slot', 3))).flat()).toEqual(expected);

    // Driven by the graffiti table, read in several batches
    const local = slotsWhere(s => !isMissed(s) && !isMev(s) && clOf(s) === 'lighthouse');
    expect((await allPages(args({ source: 'local', cl: 'lighthouse' }, 'slot', 50))).flat()).toEqual(local);
  });

  it('returns a short page with a cursor to keep searching when matches are sparse', async () => {
    // Driven by the graffiti table; no block carries that many blobs
    const filters: SlotFilters = { el: 'geth', blobsMin: 99 };
    const first = await fetchSlotsPage({ ...args(filters), cursor: undefined }, 0, false);
    expect(first.rows).toEqual([]);
    expect(first.partial).toBe(true);
    expect(first.searchedTo).toBeGreaterThan(FIRST);
    const rest = await allPages(args(filters));
    expect(rest.flat()).toEqual([]);
    expect(rest.length).toBeGreaterThan(1);
  });

  it('marks missed slots from the proposer table and finds them by status', async () => {
    const pages = await allPages(args({ status: 'missed' }, 'slot', 7));
    expect(pages.flat()).toEqual(slotsWhere(isMissed));
    const first = await fetchSlotsPage({ ...args({}), cursor: undefined }, 0, false);
    const missed = first.rows.find(row => isMissed(row.slot))!;
    expect(missed).toMatchObject({ status: 'missed', source: null, gasUsed: null });
  });

  it('orders by gas used across pages, with filters checked on other tables', async () => {
    const expected = slotsWhere(s => !isMissed(s) && clOf(s) === 'teku').sort((a, b) => gasOf(b) - gasOf(a) || b - a);
    expect((await allPages(args({ cl: 'teku' }, 'gas', 4))).flat()).toEqual(expected);
  });

  it('does not call a block local before the MEV table has reached it', async () => {
    mevUntil = 1190;
    buildTables();
    const page = await fetchSlotsPage({ ...args({}), cursor: undefined }, 0, false);
    const recent = page.rows.filter(row => row.slot > 1190 && !isMissed(row.slot));
    expect(recent.every(row => row.source === null)).toBe(true);
    const local = (await allPages(args({ source: 'local' }, 'slot', 10))).flat();
    expect(local[0]).toBeLessThanOrEqual(1190);
  });

  it('reads slots before the proposer head table from the canonical table', async () => {
    const headStart = 2000;
    // The canonical table only holds finalized slots
    tables.int_block_proposer_canonical = tables.fct_block_proposer_head.filter(row => row.slot < 3900);
    for (const table of ['fct_block_proposer_head', 'fct_block_proposer', 'fct_block_proposer_entity']) {
      tables[table] = tables[table].filter(row => row.slot >= headStart);
    }

    expect((await allPages(args({}), headStart)).flat()).toEqual(slotsWhere(() => true));
    expect((await allPages(args({ status: 'missed' }, 'slot', 7), headStart)).flat()).toEqual(slotsWhere(isMissed));
    // Orphaned blocks are only known from the status table
    expect((await allPages(args({ status: 'orphaned' }), headStart)).flat()).toEqual([]);

    const old = await fetchSlotsPage({ ...args({}), cursor: 'lt:2010' }, 0, false, headStart);
    expect(old.rows.map(row => row.slot)).toEqual(slotsWhere(s => s < 2010).slice(0, 25));
    expect(old.rows.find(row => row.slot < headStart && isMissed(row.slot))).toMatchObject({
      status: 'missed',
      entity: null,
    });
    // Previous reads back up across the split
    const back = await fetchSlotsPage({ ...args({}), cursor: old.prevCursor }, 0, false, headStart);
    expect(back.rows.map(row => row.slot)).toEqual(slotsWhere(s => s >= 2010).slice(-25));
  });

  it('shows finalized blocks from fct_block and newer ones from fct_block_head', async () => {
    const finalTo = 3900;
    const txs = (rows: { slot: number; txCount: number | null }[]): [number, number | null][] =>
      rows.map(row => [row.slot, row.txCount]);
    const finalTxs = (slot: number): number => 100 + (slot % 11);

    const head = await fetchSlotsPage({ ...args({}), cursor: undefined }, 0, false, undefined, finalTo);
    expect(txs(head.rows)).toEqual(slotsWhere(s => s > LAST - 25).map(s => [s, isMissed(s) ? null : s % 11]));

    const old = await fetchSlotsPage({ ...args({}), cursor: 'lt:2010' }, 0, false, undefined, finalTo);
    expect(txs(old.rows)).toEqual(
      slotsWhere(s => s < 2010)
        .slice(0, 25)
        .map(s => [s, isMissed(s) ? null : finalTxs(s)])
    );

    // Value sorts page through fct_block_head but still show the finalized block
    const byGas = await fetchSlotsPage({ ...args({}, 'gas'), cursor: undefined }, 0, false, undefined, finalTo);
    for (const row of byGas.rows) expect(row.txCount).toBe(row.slot <= finalTo ? finalTxs(row.slot) : row.slot % 11);
  });

  it('filters by blob count from the payload blob gas', async () => {
    const pages = await allPages(args({ blobsMax: 0 }, 'slot', 10));
    expect(pages.flat()).toEqual(slotsWhere(s => !isMissed(s) && s % 7 === 0));
  });
});
