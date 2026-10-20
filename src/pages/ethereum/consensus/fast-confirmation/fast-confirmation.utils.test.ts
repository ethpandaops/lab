import { describe, expect, it } from 'vitest';
import {
  type BlockObservation,
  buildField,
  formatDurationMs,
  groupStallEpisodes,
  logHistogram,
  summarizeSlots,
  tierForMs,
  summarizeClients,
} from './fast-confirmation.utils';
import type { ClientDay } from './fast-confirmation.api';

function obs(overrides: Partial<BlockObservation>): BlockObservation {
  return {
    slot: 100,
    slotStartDateTime: 1_000,
    blockRoot: '0xabc',
    status: 'canonical',
    client: 'lighthouse',
    node: 'node-a',
    confirmationType: 'direct',
    fastConfirmedMs: 11_560,
    confirmationSlot: 100,
    finalizedMs: 950_000,
    ...overrides,
  };
}

describe('formatDurationMs', () => {
  it('formats sub-second, seconds, minutes and hours', () => {
    expect(formatDurationMs(450)).toBe('450ms');
    expect(formatDurationMs(11_563)).toBe('11.6s');
    expect(formatDurationMs(949_000)).toBe('15m 49s');
    expect(formatDurationMs(60_500)).toBe('1m 01s');
    expect(formatDurationMs(3_840_000)).toBe('1h 4m');
  });

  it('returns a dash for missing values', () => {
    expect(formatDurationMs(null)).toBe('-');
    expect(formatDurationMs(undefined)).toBe('-');
    expect(formatDurationMs(Number.NaN)).toBe('-');
  });
});

describe('summarizeSlots', () => {
  it('takes the earliest confirmation across nodes and ignores orphaned rows', () => {
    const summaries = summarizeSlots([
      obs({ client: 'nimbus', node: 'node-b', fastConfirmedMs: 12_045 }),
      obs({}),
      obs({ slot: 101, confirmationType: 'descendant', fastConfirmedMs: 30_000 }),
      obs({ slot: 101, blockRoot: '0xdef', status: 'orphaned' }),
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({ slot: 100, epoch: 3, fastConfirmedMs: 11_560, viaDescendant: false });
    expect(summaries[0].byClient.map(c => c.client)).toEqual(['lighthouse', 'nimbus']);
    expect(summaries[1]).toMatchObject({ slot: 101, fastConfirmedMs: 30_000, viaDescendant: true });
  });

  it('keeps one entry per client using the earliest node', () => {
    const [summary] = summarizeSlots([
      obs({ client: 'tysm', node: 'tysm-1', fastConfirmedMs: 12_300 }),
      obs({ client: 'tysm', node: 'tysm-2', fastConfirmedMs: 12_080 }),
      obs({ client: 'tysm', node: 'tysm-3', fastConfirmedMs: null, confirmationType: 'unconfirmed' }),
    ]);
    expect(summary.byClient).toEqual([{ client: 'tysm', fastConfirmedMs: 12_080, confirmationType: 'direct' }]);
  });

  it('keeps unconfirmed slots with a null confirmation time', () => {
    const [summary] = summarizeSlots([obs({ confirmationType: 'unconfirmed', fastConfirmedMs: null })]);
    expect(summary.fastConfirmedMs).toBeNull();
    expect(summary.unconfirmed).toBe(true);
  });
});

describe('groupStallEpisodes', () => {
  it('merges slow slots within an epoch of each other per node, newest first', () => {
    const episodes = groupStallEpisodes([
      obs({ slot: 10, fastConfirmedMs: 200_000 }),
      obs({ slot: 11, fastConfirmedMs: 190_000 }),
      obs({ slot: 13, fastConfirmedMs: 170_000 }),
      obs({ slot: 40, fastConfirmedMs: 30_000 }),
      obs({ slot: 100, fastConfirmedMs: 30_000 }),
      obs({ slot: 12, node: 'node-b', client: 'nimbus', fastConfirmedMs: 25_000 }),
    ]);

    expect(episodes.map(e => [e.node, e.startSlot, e.endSlot, e.blocks, e.worstMs])).toEqual([
      ['node-a', 100, 100, 1, 30_000],
      ['node-b', 12, 12, 1, 25_000],
      ['node-a', 10, 40, 4, 200_000],
    ]);
  });
});

describe('logHistogram', () => {
  it('buckets values into log-spaced bins and clamps outliers', () => {
    const buckets = logHistogram([11_000, 12_000, 900_000, 1, 10_000_000], 1, 1000, 3);
    expect(buckets.map(b => b.count)).toEqual([1, 2, 2]);
    expect(buckets[0].center).toBeCloseTo(10 ** 0.5);
  });
});

describe('tierForMs', () => {
  it('maps the slowest confirmation to a tier', () => {
    expect(tierForMs(null)).toBe('ok');
    expect(tierForMs(13_000)).toBe('late');
    expect(tierForMs(30_000)).toBe('slow');
    expect(tierForMs(210_000)).toBe('stalled');
    expect(tierForMs(779_603)).toBe('held');
  });
});

describe('buildField', () => {
  const genesis = 1_606_824_023;
  const hourOf = (epoch: number): number => Math.floor((genesis + epoch * 384) / 3600) * 3600;

  it('lays epochs out by UTC day and marks late epochs and gaps', () => {
    const start = 478_000;
    const hours = [hourOf(start), hourOf(start) + 3600, hourOf(start) + 3 * 3600];
    const field = buildField(genesis, hours, [
      obs({ slot: (start + 3) * 32 + 5, fastConfirmedMs: 30_000 }),
      obs({ slot: (start + 3) * 32 + 6, fastConfirmedMs: 13_000 }),
      obs({ slot: (start + 4) * 32, fastConfirmedMs: 779_603, status: 'orphaned' }),
    ]);

    expect(field.columns).toBe(225);
    const late = field.byEpoch.get(start + 3);
    expect(late).toMatchObject({ tier: 'slow', worstMs: 30_000, lateBlocks: 2 });
    expect(field.byEpoch.get(start + 4)?.tier).toBe('ok');
    const gap = field.epochs.find(e => Math.floor(e.startTime / 3600) * 3600 === hourOf(start) + 2 * 3600);
    expect(gap?.tier).toBe('none');
    for (const e of field.epochs) {
      expect(e.column).toBeGreaterThanOrEqual(0);
      expect(e.column).toBeLessThan(225);
      expect(field.days[e.day]).toBe(Math.floor(e.startTime / 86_400) * 86_400);
    }
  });

  it('returns an empty field without coverage', () => {
    expect(buildField(genesis, [], []).epochs).toHaveLength(0);
  });
});

describe('summarizeClients', () => {
  const day = (over: Partial<ClientDay>): ClientDay => ({
    day: '2026-09-29',
    client: 'lighthouse',
    slots: 7000,
    observations: 7000,
    direct: 6990,
    orphaned: 0,
    unconfirmed: 0,
    p50FastMs: 11_560,
    p99FastMs: 12_000,
    maxFastMs: 24_000,
    p50FinalityMs: 947_000,
    ...over,
  });

  it('weights medians by observations and orders clients by blocks', () => {
    const [lh, nimbus] = summarizeClients([
      day({ day: '2026-05-14', slots: 1000, observations: 1000, p50FastMs: 11_700 }),
      day({}),
      day({ client: 'nimbus', slots: 300, observations: 300, direct: 290, p50FastMs: 12_045, maxFastMs: 84_000 }),
    ]);
    expect(lh.client).toBe('lighthouse');
    expect(lh.since).toBe('2026-05-14');
    expect(lh.blocks).toBe(8000);
    expect(lh.fastMs).toBeCloseTo((11_700 * 1000 + 11_560 * 7000) / 8000);
    expect(nimbus.directShare).toBeCloseTo(290 / 300);
    expect(nimbus.worstMs).toBe(84_000);
  });
});
