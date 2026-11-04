import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { EpochFilters } from '../IndexPage.types';
import { fetchEpochsPage, type EpochsPageResult } from './useEpochsData';

/**
 * Genesis is 0, so slot s starts at s * 12 and epoch e at e * 384. fct_epoch_summary_canonical holds epochs
 * EARLIEST-LATEST, the head tables HEAD_FROM-CURRENT, so the unfinalized tail is LATEST + 1 to CURRENT.
 */
const EARLIEST = 100;
const LATEST = 40_495;
const CURRENT = 40_499;
const HEAD_FROM = 40_400;
const SUMMARY = { earliest: EARLIEST, latest: LATEST };
const EPOCH_SECONDS = 384;

const age = (epoch: number): number => CURRENT - epoch;
/** Slots without a block in the head tables: 2 in 40497, 1 in 40496 */
const missedIn = (epoch: number): number => (age(epoch) % 9 === 2 ? 2 : age(epoch) % 4 === 3 ? 1 : 0);
/** Once finalized, an orphaned block adds a missed slot that the head tables never saw */
const orphanedIn = (epoch: number): number => (age(epoch) % 10 === 6 ? 1 : 0);
/**
 * Participation in percent: 99.5 normally, 90 every 50th epoch, and every 7th 96 (40497 among them) or, every other
 * time, 96.004, which rounds down to the same 9600 basis points
 */
const participationOf = (epoch: number): number =>
  age(epoch) % 50 === 25 ? 90 : age(epoch) % 14 === 9 ? 96.004 : age(epoch) % 7 === 2 ? 96 : 99.5;

/** What the list should show: head figures for the tail, summary figures once finalized */
const missedShown = (epoch: number): number => missedIn(epoch) + (epoch <= LATEST ? orphanedIn(epoch) : 0);

const summaryQueries: Array<Record<string, number | string>> = [];
const headQueries: Array<Record<string, number | string>> = [];

const SUMMARY_PARAMS = new Set([
  'epoch_start_date_time_gte',
  'epoch_start_date_time_lte',
  'missed_slot_count_gte',
  'missed_slot_count_lte',
  'participation_bps_gte',
  'participation_bps_lte',
  'order_by',
  'page_size',
]);

/** fct_epoch_summary_canonical, rejecting parameters the API does not have as the server does */
async function summaryList({
  query,
}: {
  query: Record<string, number | string>;
}): Promise<{ data: { fct_epoch_summary_canonical: object[] } }> {
  summaryQueries.push(query);
  const unknown = Object.keys(query).filter(key => !SUMMARY_PARAMS.has(key));
  if (unknown.length > 0) throw new Error(`unknown parameters ${unknown.join(', ')}`);
  if (query.epoch_start_date_time_gte === undefined && query.epoch_start_date_time_lte === undefined) {
    throw new Error('epoch_start_date_time filter required');
  }
  const from = Math.max(EARLIEST, Math.ceil(Number(query.epoch_start_date_time_gte ?? 0) / EPOCH_SECONDS));
  const to = Math.min(LATEST, Math.floor(Number(query.epoch_start_date_time_lte ?? Infinity) / EPOCH_SECONDS));
  const ascending = query.order_by === 'epoch_start_date_time asc';
  if (!ascending && query.order_by !== 'epoch_start_date_time desc') throw new Error('unexpected order');
  const rows = [];
  for (let i = 0; i <= to - from && rows.length < Number(query.page_size); i++) {
    const epoch = ascending ? from + i : to - i;
    const missed = missedIn(epoch) + orphanedIn(epoch);
    if (query.missed_slot_count_gte !== undefined && missed < Number(query.missed_slot_count_gte)) continue;
    if (query.missed_slot_count_lte !== undefined && missed > Number(query.missed_slot_count_lte)) continue;
    const bps = Math.floor(participationOf(epoch) * 100);
    if (query.participation_bps_gte !== undefined && bps < Number(query.participation_bps_gte)) continue;
    if (query.participation_bps_lte !== undefined && bps > Number(query.participation_bps_lte)) continue;
    rows.push({
      epoch,
      epoch_start_date_time: epoch * EPOCH_SECONDS,
      slot_count: 32,
      canonical_block_count: 32 - missed,
      missed_slot_count: missed,
      participation_rate: participationOf(epoch) / 100,
      participation_bps: bps,
    });
  }
  return { data: { fct_epoch_summary_canonical: rows } };
}

/** A per-slot head table holding slots of epochs HEAD_FROM-CURRENT */
function headList<T>(key: string, row: (slot: number) => T) {
  return async ({ query }: { query: Record<string, number | string> }) => {
    headQueries.push(query);
    const from = Math.max(HEAD_FROM * 32, Math.ceil(Number(query.slot_start_date_time_gte) / 12));
    const to = Math.min((CURRENT + 1) * 32 - 1, Math.floor(Number(query.slot_start_date_time_lte) / 12));
    return { data: { [key]: Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => row(from + i)) } };
  };
}

vi.mock('@/api/sdk.gen', () => ({
  fctEpochSummaryCanonicalServiceList: summaryList,
  fctBlockProposerHeadServiceList: headList('fct_block_proposer_head', slot => ({
    slot,
    slot_start_date_time: slot * 12,
    block_root: slot % 32 < missedIn(Math.floor(slot / 32)) ? null : `0x${slot}`,
  })),
  fctAttestationCorrectnessHeadServiceList: headList('fct_attestation_correctness_head', slot => ({
    slot,
    slot_start_date_time: slot * 12,
    votes_max: 1000,
    votes_head: participationOf(Math.floor(slot / 32)) * 10 - 5,
    votes_other: 5,
  })),
  fctAttestationLivenessByEntityHeadServiceList: headList('fct_attestation_liveness_by_entity_head', () => ({})),
}));

const page = (filters: EpochFilters, pageSize: number, cursor?: string): Promise<EpochsPageResult> =>
  fetchEpochsPage({ filters, pageSize, cursor }, 0, SUMMARY, CURRENT);

async function allEpochs(filters: EpochFilters, pageSize: number): Promise<number[]> {
  const epochs: number[] = [];
  let cursor: string | undefined;
  for (let n = 0; n < 1000; n++) {
    const result = await page(filters, pageSize, cursor);
    epochs.push(...result.rows.map(row => row.epoch));
    cursor = result.nextCursor;
    if (!cursor) break;
  }
  return epochs;
}

const epochsWhere = (predicate: (epoch: number) => boolean, newest: number, oldest = EARLIEST): number[] =>
  Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i).filter(predicate);

beforeEach(() => {
  summaryQueries.length = 0;
  headQueries.length = 0;
});

describe('fetchEpochsPage', () => {
  it('fills the first page with the unfinalized tail from the head tables, then finalized epochs', async () => {
    const first = await page({}, 10);
    expect(first.rows.map(row => row.epoch)).toEqual(epochsWhere(() => true, CURRENT, CURRENT - 9));
    expect(first.nextCursor).toBe('lt:40490');
    expect(summaryQueries).toEqual([
      {
        epoch_start_date_time_gte: EARLIEST * EPOCH_SECONDS,
        epoch_start_date_time_lte: LATEST * EPOCH_SECONDS,
        order_by: 'epoch_start_date_time desc',
        page_size: 7,
      },
    ]);
    // Both head tables, read for the tail only
    expect(headQueries).toHaveLength(2);
    expect(headQueries[0]).toMatchObject({
      slot_start_date_time_gte: (LATEST + 1) * EPOCH_SECONDS,
      slot_start_date_time_lte: (CURRENT + 1) * EPOCH_SECONDS - 12,
    });

    const head = first.rows.find(r => r.epoch === 40_497)!;
    expect(head).toMatchObject({ proposed: 30, missed: 2, startTime: 40_497 * EPOCH_SECONDS });
    expect(head.participation).toBeCloseTo(0.96);
    // An orphaned block shows as missed once finalized
    expect(first.rows.find(r => r.epoch === 40_493)).toMatchObject({ proposed: 31, missed: 1 });
  });

  it('pages from a cursor inside the tail into finalized epochs and back', async () => {
    const first = await page({}, 3);
    expect(first.rows.map(row => row.epoch)).toEqual([40_499, 40_498, 40_497]);
    expect(first.nextCursor).toBe('lt:40497');
    expect(summaryQueries).toEqual([]);

    const second = await page({}, 3, first.nextCursor);
    expect(second.rows.map(row => row.epoch)).toEqual([40_496, 40_495, 40_494]);
    expect(second.rows[0]).toMatchObject({ missed: 1, proposed: 31 });
    expect(summaryQueries.at(-1)).toMatchObject({ epoch_start_date_time_lte: LATEST * EPOCH_SECONDS, page_size: 3 });

    const back = await page({}, 3, second.prevCursor);
    expect(back.rows).toEqual(first.rows);
    const third = await page({}, 3, second.nextCursor);
    expect((await page({}, 3, third.prevCursor)).rows).toEqual(second.rows);

    expect(await allEpochs({ epochMin: 40_300 }, 7)).toEqual(epochsWhere(() => true, CURRENT, 40_300));
  });

  it('reaches the earliest finalized epoch, before the head tables start, without reading them', async () => {
    const result = await page({ epochMax: 150 }, 100);
    expect(result.rows.map(row => row.epoch)).toEqual(epochsWhere(() => true, 150));
    expect(result.nextCursor).toBeUndefined();
    expect(headQueries).toEqual([]);
    expect(summaryQueries).toEqual([
      {
        epoch_start_date_time_gte: EARLIEST * EPOCH_SECONDS,
        epoch_start_date_time_lte: 150 * EPOCH_SECONDS,
        order_by: 'epoch_start_date_time desc',
        page_size: 101,
      },
    ]);
  });

  it('filters missed slots on the server for finalized epochs and here for the tail', async () => {
    const first = await page({ missedMin: 2 }, 5);
    expect(first.rows.map(row => row.epoch)).toEqual(epochsWhere(e => missedShown(e) >= 2, CURRENT - 1).slice(0, 5));
    expect(summaryQueries).toEqual([
      {
        epoch_start_date_time_gte: EARLIEST * EPOCH_SECONDS,
        epoch_start_date_time_lte: LATEST * EPOCH_SECONDS,
        missed_slot_count_gte: 2,
        order_by: 'epoch_start_date_time desc',
        page_size: 5,
      },
    ]);

    expect(await allEpochs({ missedMin: 2, epochMin: 40_000 }, 5)).toEqual(
      epochsWhere(e => missedShown(e) >= 2, CURRENT - 1, 40_000)
    );
    // Orphaned blocks count as missed once finalized, so epochs the head tables saw full still match
    expect(await allEpochs({ missedMin: 1, missedMax: 1, epochMin: 40_300 }, 10)).toEqual(
      epochsWhere(e => missedShown(e) === 1, CURRENT - 1, 40_300)
    );
  });

  it('filters participation on the server by basis points and exactly here', async () => {
    const first = await page({ participationMax: 99 }, 25);
    // 40497 is the one tail epoch at or below 99%
    expect(first.rows.map(row => row.epoch)).toEqual(
      epochsWhere(e => participationOf(e) <= 99, CURRENT - 1).slice(0, 25)
    );
    expect(summaryQueries[0]).toEqual({
      epoch_start_date_time_gte: EARLIEST * EPOCH_SECONDS,
      epoch_start_date_time_lte: LATEST * EPOCH_SECONDS,
      participation_bps_lte: 9900,
      order_by: 'epoch_start_date_time desc',
      page_size: 27,
    });

    // 96.004% is kept by the server at 9600 basis points and dropped here
    expect(await allEpochs({ participationMax: 96, epochMin: 40_000 }, 3)).toEqual(
      epochsWhere(e => participationOf(e) <= 96, CURRENT - 1, 40_000)
    );
    expect(summaryQueries.at(-1)).toMatchObject({ participation_bps_lte: 9600 });
    expect(await allEpochs({ participationMin: 96.0035, participationMax: 96.5, epochMin: 40_000 }, 3)).toEqual(
      epochsWhere(e => participationOf(e) === 96.004, CURRENT - 1, 40_000)
    );
    expect(summaryQueries.at(-1)).toMatchObject({ participation_bps_gte: 9600, participation_bps_lte: 9650 });
    expect(await allEpochs({ participationMax: 95, missedMin: 1, epochMax: 40_480 }, 5)).toEqual(
      epochsWhere(e => participationOf(e) <= 95 && missedShown(e) >= 1, 40_480)
    );

    summaryQueries.length = 0;
    expect(await page({ participationMin: 100 }, 10)).toEqual({ rows: [], prevCursor: 'gt:40498' });
    expect(summaryQueries).toHaveLength(1);
  });
});
