import { describe, expect, it } from 'vitest';

import type { EntityStake } from '@/pages/ethereum/entities/hooks/useEntityStake';
import { countsOf, groupCounts, groupMembers, groupStakes } from './groups';
import { metricById, metricValue, toCounts } from './performance';

const stake = (entity: string, stakeEth: number, startEth: number): EntityStake => ({
  entity,
  validators: stakeEth / 32,
  stakeEth,
  compoundingEth: 0,
  series: [startEth, stakeEth],
  startEth,
  changeEth: stakeEth - startEth,
});

describe('groupStakes', () => {
  it('merges every Lido operator, Simple DVT clusters included, into one row ranked by its total', () => {
    const grouped = groupStakes([
      stake('kiln', 300, 300),
      stake('p2porg_lido', 200, 100),
      stake('lidoxssv_aridanubis', 64, 0),
      stake('lido', 96, 96),
    ]);
    expect(grouped.map(e => [e.entity, e.stakeEth, e.changeEth])).toEqual([
      ['*lido', 360, 164],
      ['kiln', 300, 0],
    ]);
    expect(grouped[0].series).toEqual([196, 360]);
  });

  it('lists the members of a group largest first and leaves other entities out', () => {
    const members = groupMembers([stake('kiln', 300, 300), stake('lido', 96, 96), stake('p2porg_lido', 200, 100)]);
    expect([...members.keys()]).toEqual(['*lido']);
    expect(members.get('*lido')!.map(e => e.entity)).toEqual(['p2porg_lido', 'lido']);
  });
});

describe('group counts', () => {
  const counts = new Map([
    ['kiln_lido', toCounts({ total_duties: 1000, attested_count: 900 })],
    ['lido', toCounts({ total_duties: 3000, attested_count: 3000 })],
    ['coinbase', toCounts({ total_duties: 5000, attested_count: 4000 })],
  ]);

  it('rates a group by its summed duties, not by averaging its operators', () => {
    const lido = countsOf(counts, '*lido')!;
    expect(metricValue(metricById('attested'), lido)).toBeCloseTo(97.5, 9);
    expect(countsOf(counts, 'coinbase')?.duties).toBe(5000);
  });

  it('replaces the members with the group', () => {
    expect([...groupCounts(counts).keys()].sort()).toEqual(['*lido', 'coinbase']);
  });
});
