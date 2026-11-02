import { describe, it, expect } from 'vitest';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import {
  censusVersions,
  forkIdNextLabel,
  groupForkIdNext,
  groupNextForkDigests,
  latestFullDay,
  peerShareChart,
  unifiedClientRows,
} from './census';

const network = {
  name: 'sepolia',
  forks: {
    consensus: {
      fulu: { epoch: 272640, timestamp: 1760427360, min_client_versions: {} },
      gloas: { epoch: 353024, timestamp: 1791294816, min_client_versions: {} },
    },
    execution: { london: { block: 10499401, timestamp: 0 } },
  },
} as unknown as Network;

describe('latestFullDay', () => {
  it('should skip today while an earlier day exists', () => {
    const rows = [{ day_start_date: '2026-11-01' }, { day_start_date: '2026-11-02' }];
    expect(latestFullDay(rows, '2026-11-02')).toBe('2026-11-01');
    expect(latestFullDay([{ day_start_date: '2026-11-02' }], '2026-11-02')).toBe('2026-11-02');
    expect(latestFullDay([], '2026-11-02')).toBeNull();
  });
});

describe('censusVersions', () => {
  it('should count a peer under the release it names, whatever its commit', () => {
    const versions = censusVersions(
      [
        { version: 'v8.3.2', release_status: 'commit_match', peer_count: 5 },
        { version: 'v8.3.2', release_status: 'commit_untagged', peer_count: 2 },
        { version: 'v8.3.2', release_status: 'commit_unmatched', peer_count: 1 },
        { version: 'v9.9.9', release_status: 'version_unmatched', peer_count: 3 },
        { version: '', release_status: 'none', peer_count: 9 },
      ],
      row => row.peer_count
    );
    expect(versions).toEqual([
      { version: '', resolved: false, untagged: 0, statedOnly: 0, count: 9 },
      { version: 'v8.3.2', resolved: true, untagged: 2, statedOnly: 1, count: 8 },
      { version: 'v9.9.9', resolved: false, untagged: 0, statedOnly: 3, count: 3 },
    ]);
  });
});

describe('next fork', () => {
  it('should name the most advertised digest after the scheduled fork and leave stray digests raw', () => {
    const groups = groupNextForkDigests(
      [
        { next_fork_digest: '', node_count: 32 },
        { next_fork_digest: '0xaaaa', node_count: 50 },
        { next_fork_digest: '0xaaaa', node_count: 6 },
        { next_fork_digest: '0xbbbb', node_count: 3 },
      ],
      { name: 'Gloas' }
    );
    expect(groups).toEqual([
      { label: 'Gloas', isNext: true, count: 56 },
      { label: 'No fork scheduled', isNext: false, count: 32 },
      { label: '0xbbbb', isNext: false, count: 3 },
    ]);
  });

  it('should not name any digest when the config schedules no fork', () => {
    expect(groupNextForkDigests([{ next_fork_digest: '0xaaaa', node_count: 1 }], null)[0]).toEqual({
      label: '0xaaaa',
      isNext: false,
      count: 1,
    });
  });

  it('should map fork_id_next timestamps and blocks to forks', () => {
    expect(forkIdNextLabel('1791294816', network)).toBe('Glamsterdam');
    expect(forkIdNextLabel('10499401', network)).toBe('London');
    expect(forkIdNextLabel('', network)).toBe('No fork scheduled');
    expect(forkIdNextLabel('123', network)).toBe('123');
    const groups = groupForkIdNext(
      [
        { fork_id_next: '1791294816', node_count: 4 },
        { fork_id_next: '', node_count: 6 },
      ],
      network,
      1790000000
    );
    expect(groups[0]).toEqual({ label: 'Glamsterdam', isNext: true, count: 4 });
  });
});

describe('unifiedClientRows', () => {
  it('should give known clients rows and lump every other agent into Other', () => {
    const { rows, other, peerTotal } = unifiedClientRows(
      'consensus',
      [
        { client: 'lighthouse', blocks: 60, share: 40, identifiedShare: 60 },
        { client: 'prysm', blocks: 40, share: 30, identifiedShare: 40 },
        { client: 'unknown', blocks: 50, share: 30, identifiedShare: null },
      ],
      [
        { client: 'lighthouse', peer_count: 500 },
        { client: 'teku', peer_count: 100 },
        { client: 'rust-libp2p', peer_count: 150 },
        { client: 'myotis', peer_count: 50 },
        { client: 'other', peer_count: 200 },
        { client: 'unknown', peer_count: 999 },
      ]
    );
    expect(rows.map(row => [row.client, row.blockShare, row.peers, row.peerShare])).toEqual([
      ['lighthouse', 60, 500, 50],
      ['prysm', 40, 0, 0],
      ['teku', 0, 100, 10],
    ]);
    expect(other).toEqual({ peers: 400, peerShare: 40 });
    expect(peerTotal).toBe(1000);
  });

  it('should keep execution agents out of consensus rows', () => {
    const { rows, other } = unifiedClientRows('consensus', [], [{ client: 'geth', peer_count: 10 }]);
    expect(rows).toEqual([]);
    expect(other.peers).toBe(10);
  });
});

describe('peerShareChart', () => {
  it('should stack daily peer shares per client with Other last', () => {
    const chart = peerShareChart('execution', [
      { day_start_date: '2026-11-01', client: 'geth', peer_count: 30 },
      { day_start_date: '2026-11-01', client: 'meganode', peer_count: 10 },
      { day_start_date: '2026-11-01', client: 'unknown', peer_count: 100 },
      { day_start_date: '2026-10-31', client: 'reth', peer_count: 20 },
      { day_start_date: '2026-10-31', client: 'geth', peer_count: 20 },
    ]);
    expect(chart.days).toEqual(['2026-10-31', '2026-11-01']);
    expect(chart.series.map(series => [series.name, series.data])).toEqual([
      ['Geth', [50, 75]],
      ['Reth', [50, 0]],
      ['Other', [0, 25]],
    ]);
  });
});
