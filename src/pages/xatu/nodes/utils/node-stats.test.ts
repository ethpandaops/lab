import { describe, expect, it } from 'vitest';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import {
  axisCeiling,
  getIngestedEndSlot,
  getLatestVersions,
  getSyncState,
  getSlotWindow,
  histogram,
  isNodeOnline,
  median,
  shareSlowerThan,
  shortVersion,
  summarize,
} from './node-stats';

describe('summarize', () => {
  it('interpolates percentiles between ranks of unsorted input', () => {
    const summary = summarize([400, 100, 300, 200, 1000]);
    expect(summary).toMatchObject({ count: 5, min: 100, p50: 300, max: 1000 });
    // rank 0.9 * 4 = 3.6 → 400 + 0.6 * (1000 - 400)
    expect(summary?.p90).toBeCloseTo(760);
    expect(summary?.p10).toBeCloseTo(140);
  });

  it('returns null for no values', () => {
    expect(summarize([])).toBeNull();
    expect(median([])).toBeNull();
  });

  it('averages the middle pair for an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('shareSlowerThan', () => {
  it('counts only strictly slower nodes', () => {
    expect(shareSlowerThan(200, [100, 200, 300, 400])).toBe(0.5);
    expect(shareSlowerThan(50, [100, 200])).toBe(1);
    expect(shareSlowerThan(500, [100, 200])).toBe(0);
  });

  it('returns null without other nodes', () => {
    expect(shareSlowerThan(100, [])).toBeNull();
  });
});

describe('isNodeOnline', () => {
  it('treats the 15 minute threshold as inclusive', () => {
    expect(isNodeOnline(1000, 1000 + 15 * 60)).toBe(true);
    expect(isNodeOnline(1000, 1000 + 15 * 60 + 1)).toBe(false);
    expect(isNodeOnline(undefined, 1000)).toBe(false);
  });
});

describe('getSlotWindow', () => {
  it('ends before the in-progress slot on a step boundary', () => {
    // Slot 1003 is in progress, so the last complete slot is 1002 → aligned end 1000
    expect(getSlotWindow(1003, 64, 5)).toEqual({ startSlot: 936, endSlot: 1000 });
    // On a boundary the in-progress slot itself is excluded
    expect(getSlotWindow(1000, 64, 5)).toEqual({ startSlot: 931, endSlot: 995 });
  });

  it('never starts before genesis', () => {
    expect(getSlotWindow(20, 64, 5)).toEqual({ startSlot: 0, endSlot: 15 });
  });
});

describe('histogram', () => {
  it('puts boundary values in the upper bucket and clamps overflow into the last', () => {
    const { starts, counts } = histogram([0, 99, 100, 250, 5000], 100, 300);
    expect(starts).toEqual([0, 100, 200]);
    expect(counts).toEqual([2, 1, 2]);
  });

  it('starts at minMs and clamps values below it into the first bucket', () => {
    const { starts, counts } = histogram([90, 140, 150, 260], 50, 300, 100);
    expect(starts).toEqual([100, 150, 200, 250]);
    expect(counts).toEqual([2, 1, 0, 1]);
  });
});

describe('getLatestVersions', () => {
  it('picks the highest version per implementation, ignoring build hashes', () => {
    const nodes = [
      { meta_client_implementation: 'Contributoor', meta_client_version: 'v0.0.70-7195855' },
      { meta_client_implementation: 'Contributoor', meta_client_version: 'v0.0.72-5328921' },
      { meta_client_implementation: 'Contributoor', meta_client_version: 'v0.0.9-aaaaaaa' },
      { meta_client_implementation: 'Xatu', meta_client_version: 'v1.30.2-719b24d7' },
    ] as FctNodeActiveLast24h[];
    const latest = getLatestVersions(nodes);
    expect(latest.get('Contributoor')).toBe('v0.0.72-5328921');
    expect(latest.get('Xatu')).toBe('v1.30.2-719b24d7');
  });
});

describe('shortVersion', () => {
  it('drops commit, pre-release and platform suffixes', () => {
    expect(shortVersion('v26.10.2-0abc0d1')).toBe('v26.10.2');
    expect(shortVersion('3.8.1-cf6f1413 linux')).toBe('3.8.1');
    expect(shortVersion('1.17.8+stable')).toBe('1.17.8');
    expect(shortVersion('v8.3.0')).toBe('v8.3.0');
    expect(shortVersion(undefined)).toBe('');
  });
});

describe('axisCeiling', () => {
  it('caps the axis below a lone spike, rounded up to a whole step', () => {
    const values = [...Array.from({ length: 99 }, (_, i) => 1000 + i * 10), 45000];
    // p98 ≈ 1,970 → ×1.2 ≈ 2,364 → next 1,000
    expect(axisCeiling(values)).toBe(3000);
  });

  it('leaves the axis alone when nothing is far above the rest', () => {
    expect(axisCeiling([100, 120, 130, null])).toBeUndefined();
    expect(axisCeiling([])).toBeUndefined();
  });
});

describe('getIngestedEndSlot', () => {
  it('ends after the newest slot any node reported, ignoring trailing empty slots', () => {
    const slots = [
      { slot: 10, nodeCount: 5 },
      { slot: 11, nodeCount: 0 },
      { slot: 12, nodeCount: 4 },
      { slot: 13, nodeCount: 0 },
      { slot: 14, nodeCount: 0 },
    ];
    expect(getIngestedEndSlot(slots, 15)).toBe(13);
    expect(getIngestedEndSlot([{ slot: 10, nodeCount: 0 }], 11)).toBe(11);
  });
});

describe('getSyncState', () => {
  const slots = Array.from({ length: 20 }, (_, i) => ({ slot: 100 + i, p50: 1500, nodeCount: 120 }));

  it('is in sync when the node trails the network by less than a slot', () => {
    const block = new Map(slots.map(s => [s.slot, 2500]));
    expect(getSyncState(block, slots)).toEqual({ state: 'in-sync', lagMs: 1000 });
  });

  it('is catching up when recent blocks arrive more than a slot after the network saw them', () => {
    const block = new Map(slots.map(s => [s.slot, 40000]));
    expect(getSyncState(block, slots)?.state).toBe('catching-up');
  });

  it('is missing blocks when the node sees almost none of the recent slots', () => {
    expect(getSyncState(new Map([[119, 1500]]), slots)?.state).toBe('missing-blocks');
  });

  it('ignores slots no node has reported yet', () => {
    const pending = [...slots, { slot: 120, p50: null, nodeCount: 0 }];
    const block = new Map(slots.map(s => [s.slot, 1600]));
    expect(getSyncState(block, pending)?.state).toBe('in-sync');
    expect(getSyncState(new Map(), [{ slot: 1, p50: null, nodeCount: 0 }])).toBeNull();
  });
});
