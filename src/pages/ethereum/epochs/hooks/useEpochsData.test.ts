import { describe, it, expect, vi } from 'vitest';
import type { EpochFilters } from '../IndexPage.types';
import { fetchEpochsPage } from './useEpochsData';

/** Epochs 100-499 in memory; genesis is 0 so a slot starts at slot * 12 */
const EARLIEST = 100;
const CURRENT = 499;
const SLOTS = Array.from({ length: (CURRENT - EARLIEST + 1) * 32 }, (_, i) => EARLIEST * 32 + i);

const missedIn = (epoch: number): number => (epoch % 9 === 0 ? 2 : epoch % 4 === 0 ? 1 : 0);
/** Participation in percent: 99.5 normally, 96 every 7th epoch, 90 every 50th */
const participationOf = (epoch: number): number => (epoch % 50 === 0 ? 90 : epoch % 7 === 0 ? 96 : 99.5);

const proposerRows = SLOTS.map(slot => ({
  slot,
  slot_start_date_time: slot * 12,
  block_root: slot % 32 < missedIn(Math.floor(slot / 32)) ? null : `0x${slot}`,
}));
const correctnessRows = SLOTS.map(slot => ({
  slot,
  slot_start_date_time: slot * 12,
  votes_max: 1000,
  votes_head: participationOf(Math.floor(slot / 32)) * 10 - 5,
  votes_other: 5,
}));

function list(key: string, rows: () => Array<{ slot: number; slot_start_date_time: number }>) {
  return async ({ query }: { query: Record<string, number | string> }) => {
    const epochs = query.epoch_in_values ? new Set(String(query.epoch_in_values).split(',').map(Number)) : undefined;
    const matching = rows().filter(
      row =>
        row.slot_start_date_time >= Number(query.slot_start_date_time_gte) &&
        row.slot_start_date_time <= Number(query.slot_start_date_time_lte) &&
        (!epochs || epochs.has(Math.floor(row.slot / 32)))
    );
    return { data: { [key]: matching } };
  };
}

vi.mock('@/api/sdk.gen', () => ({
  fctBlockProposerHeadServiceList: list('fct_block_proposer_head', () => proposerRows),
  fctAttestationCorrectnessHeadServiceList: list('fct_attestation_correctness_head', () => correctnessRows),
  fctAttestationLivenessByEntityHeadServiceList: list('fct_attestation_liveness_by_entity_head', () => []),
}));

async function allEpochs(filters: EpochFilters, pageSize: number): Promise<number[]> {
  const epochs: number[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 1000; page++) {
    const result = await fetchEpochsPage({ filters, pageSize, cursor }, 0, EARLIEST, CURRENT);
    epochs.push(...result.rows.map(row => row.epoch));
    cursor = result.nextCursor;
    if (!cursor) break;
  }
  return epochs;
}

const epochsWhere = (predicate: (epoch: number) => boolean, newest = CURRENT): number[] =>
  Array.from({ length: newest - EARLIEST + 1 }, (_, i) => newest - i).filter(predicate);

describe('fetchEpochsPage', () => {
  it('lists every epoch newest first with its figures, and Previous returns the page before', async () => {
    expect(await allEpochs({}, 25)).toEqual(epochsWhere(() => true));

    const first = await fetchEpochsPage({ filters: {}, pageSize: 25 }, 0, EARLIEST, CURRENT);
    const second = await fetchEpochsPage({ filters: {}, pageSize: 25, cursor: first.nextCursor }, 0, EARLIEST, CURRENT);
    const back = await fetchEpochsPage({ filters: {}, pageSize: 25, cursor: second.prevCursor }, 0, EARLIEST, CURRENT);
    expect(back.rows).toEqual(first.rows);

    const row = first.rows.find(r => r.epoch === 495)!;
    expect(row).toMatchObject({ epoch: 495, proposed: 30, missed: 2, startTime: 495 * 32 * 12 });
    expect(row.participation).toBeCloseTo(0.995);
  });

  it('keeps only finished epochs that match participation and missed-slot ranges', async () => {
    expect(await allEpochs({ participationMax: 96 }, 10)).toEqual(
      epochsWhere(e => participationOf(e) <= 96, CURRENT - 1)
    );
    expect(await allEpochs({ missedMin: 2 }, 10)).toEqual(epochsWhere(e => missedIn(e) >= 2, CURRENT - 1));
    expect(await allEpochs({ participationMax: 95, missedMin: 1, epochMax: 400 }, 5)).toEqual(
      epochsWhere(e => participationOf(e) <= 95 && missedIn(e) >= 1, 400)
    );
  });
});
