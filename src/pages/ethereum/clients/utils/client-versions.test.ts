import { describe, it, expect } from 'vitest';
import type { DimClientRelease, FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import {
  adoptionByDay,
  buildLine,
  compareOpcodeCosts,
  countVersionsByDay,
  findRelease,
  groupVersionLines,
  latestRelease,
  matchReleaseVersion,
  nextThreshold,
  opcodeCosts,
  opcodeRowsFromDaily,
  peerClient,
  previousRelease,
  releaseName,
  releaseUrl,
  shareStat,
  summariseVersions,
  toVersionCounts,
  summariseBuildLines,
  summariseUnresolved,
  timeToAdoption,
  type ClientRelease,
  type VersionCount,
  type VersionDay,
  type VersionSummary,
} from './client-versions';

const release = (version: string, releaseDate: number | null, prerelease = false, commit = ''): DimClientRelease => ({
  client: 'lighthouse',
  version,
  tag: version,
  release_date: releaseDate,
  prerelease,
  commit_sha: commit,
  repository: 'sigp/lighthouse',
});

const releases = [
  release('v8.3.2', 300, false, 'a376defa30470923556d91bdeb15a802e297f31f'),
  release('v8.4.0-rc.0', 400, true, '484a6b1c9743cd38de2ce1f966bd77794818dc00'),
  release('v8.3.1', 200, false, '0aba4605a9a18964a165d6c0d258ae8d1621ee40'),
  release('v8.3.0-rc.0', 50, true, '4920af726c9999399c7678d4dce9d1f45d0383a1'),
  release('v8.3.0', 100, false, '014ba06b56514d383426f2c727e7233dad973e0d'),
];

describe('findRelease', () => {
  it('should resolve latest to the newest full release, skipping a newer prerelease', () => {
    expect(findRelease(releases, 'latest')?.version).toBe('v8.3.2');
  });

  it('should match versions with or without the leading v', () => {
    expect(findRelease(releases, '8.3.1')?.version).toBe('v8.3.1');
    expect(findRelease(releases, 'v8.4.0-rc.0')?.version).toBe('v8.4.0-rc.0');
  });
});

describe('previousRelease', () => {
  it('should be the highest full release below, ignoring prereleases', () => {
    expect(previousRelease(releases, releases[0])?.version).toBe('v8.3.1');
    expect(previousRelease(releases, releases[4])).toBeUndefined();
  });
});

describe('matchReleaseVersion', () => {
  it('should strip build suffixes after the release version', () => {
    expect(matchReleaseVersion('v8.3.2-a376def', releases)?.version).toBe('v8.3.2');
    expect(matchReleaseVersion('8.3.1 (linux amd64)', releases)?.version).toBe('v8.3.1');
  });

  it('should match a prerelease before its release', () => {
    expect(matchReleaseVersion('v8.3.0-rc.0-4920af7', releases)?.version).toBe('v8.3.0-rc.0');
  });

  it('should not count development builds as the release they lead to', () => {
    expect(matchReleaseVersion('v8.3.2-unstable-0x1234abcd', releases)).toBeUndefined();
    expect(matchReleaseVersion('v8.4.0-rc.1-abcdef0', releases)).toBeUndefined();
  });

  it('should not let a shorter version claim a longer one', () => {
    expect(matchReleaseVersion('26.10.1', [release('26.10', 1)])).toBeUndefined();
  });
});

describe('toVersionCounts', () => {
  it('should keep resolved versions, including branch builds, and null unresolved ones', () => {
    const rows = toVersionCounts([
      { day_start_date: '2026-11-01', version: 'v8.3.2', release_status: 'commit_match', block_count: 5 },
      { day_start_date: '2026-11-01', version: 'v8.3.2', release_status: 'commit_untagged', block_count: 2 },
      {
        day_start_date: '2026-11-01',
        version: '',
        release_status: 'commit_zero',
        commit_prefix: '0000',
        block_count: 9,
      },
      { day_start_date: '2026-11-01', version: 'v1', release_status: 'commit_match', block_count: 0 },
    ]);
    expect(rows.map(row => [row.version, row.status, row.count])).toEqual([
      ['v8.3.2', 'commit_match', 5],
      ['v8.3.2', 'commit_untagged', 2],
      [null, 'commit_zero', 9],
    ]);
    expect(rows[0].time).toBe(Date.UTC(2026, 10, 1) / 1000);
    expect(summariseVersions(rows)).toMatchObject([{ version: 'v8.3.2', blocks: 7, untaggedBlocks: 2, share: 100 }]);
  });
});

describe('peerClient', () => {
  it('should read erigon peers reporting caplin as caplin', () => {
    expect(peerClient('erigon', 'caplin')).toBe('caplin');
    expect(peerClient('erigon', 'v3.8.1')).toBe('erigon');
    expect(peerClient('Lighthouse', 'v8.3.2')).toBe('lighthouse');
  });
});

const block = (time: number, version: string | null): VersionCount => ({
  time,
  day: new Date(time * 1000).toISOString().slice(0, 10),
  version,
  status: version ? 'commit_match' : 'commit_zero',
  count: 1,
});

describe('adoptionByDay', () => {
  it('should count newer versions towards "or newer" but not "exactly"', () => {
    const day = Date.UTC(2026, 9, 1) / 1000;
    const days = countVersionsByDay([
      block(day, 'v8.3.0'),
      block(day + 1, 'v8.3.1'),
      block(day + 2, 'v8.3.2'),
      block(day + 3, 'v8.3.1'),
      block(day + 4, null),
    ]);
    expect(adoptionByDay(days, 'v8.3.1')).toEqual([{ day: '2026-10-01', exact: 50, atLeast: 75 }]);
  });
});

describe('shareStat', () => {
  it('should show the latest share and its change since the first day with blocks', () => {
    const points = [
      { day: '2026-10-01', exact: null, atLeast: null },
      { day: '2026-10-02', exact: 60, atLeast: 80 },
      { day: '2026-10-03', exact: 25.04, atLeast: 90 },
      { day: '2026-10-04', exact: null, atLeast: null },
    ];
    expect(shareStat(points, 'exact', '7d')).toEqual({
      value: '25.0%',
      delta: { value: '-35.0 pts over 7d', type: 'neutral' },
    });
    expect(shareStat(points, 'atLeast', '7d').delta?.value).toBe('+10.0 pts over 7d');
  });

  it('should leave out the change with a single day of blocks', () => {
    expect(shareStat([{ day: '2026-10-01', exact: 40, atLeast: 40 }], 'exact', '7d')).toEqual({ value: '40.0%' });
    expect(shareStat([], 'exact', '7d')).toEqual({ value: '-' });
  });
});

describe('timeToAdoption', () => {
  const releaseTime = 1_000_000 * 3600 + 600; // ten minutes past an hour

  // One block every 10 minutes: before release all on v8.3.0, after release every block from `switchAfter` on v8.3.1
  const series = (hours: number, switchAfter: number): VersionCount[] =>
    Array.from({ length: hours * 6 }, (_, i) => {
      const time = releaseTime - 24 * 3600 + i * 600;
      return block(time, time >= releaseTime + switchAfter ? 'v8.3.1' : 'v8.3.0');
    });

  it('should measure from release to the first hour whose trailing day crosses the threshold', () => {
    // Every block from release on is new, so the trailing 24h share passes 50% just after 12 hours
    const blocks = series(72, 0);
    const half = timeToAdoption(blocks, 'v8.3.1', releaseTime, 50);
    expect(half).toEqual({ status: 'reached', seconds: 13 * 3600 - 600 });
    const most = timeToAdoption(blocks, 'v8.3.1', releaseTime, 90);
    expect(most.status).toBe('reached');
    expect(most.status === 'reached' && most.seconds).toBeGreaterThan(21 * 3600);
  });

  it('should weight hourly rows by their block count', () => {
    const hour = Math.floor(releaseTime / 3600) * 3600;
    // A day of 10 old blocks an hour, then 30 new blocks an hour: 50% of the trailing day is passed once
    // new blocks outnumber the old ones still in it, after 6 hours
    const rows: VersionCount[] = [
      ...Array.from({ length: 24 }, (_, i) => ({ ...block(hour - (24 - i) * 3600, 'v8.3.0'), count: 10 })),
      ...Array.from({ length: 24 }, (_, i) => ({ ...block(hour + i * 3600, 'v8.3.1'), count: 30 })),
    ];
    const lag = timeToAdoption(rows, 'v8.3.1', hour, 50);
    expect(lag).toEqual({ status: 'reached', seconds: 6 * 3600 });
  });

  it('should report not reached when the share never gets there', () => {
    expect(timeToAdoption(series(30, 20 * 3600), 'v8.3.1', releaseTime, 90)).toEqual({ status: 'not-reached' });
  });

  it('should report out of window when blocks start after the release', () => {
    const late = series(72, 0).filter(b => b.time > releaseTime + 2 * 3600);
    expect(timeToAdoption(late, 'v8.3.1', releaseTime, 50)).toEqual({ status: 'out-of-window' });
  });
});

describe('nextThreshold', () => {
  it('should name the next threshold above a share and the distance to it', () => {
    expect(nextThreshold(20)?.label).toBe('33%');
    const next = nextThreshold(40);
    expect(next?.label).toBe('50%');
    expect(next?.distance).toBeCloseTo(10);
    expect(nextThreshold(70)).toBeNull();
  });
});

describe('build lines', () => {
  it('should drop trailing commits but keep the channel', () => {
    expect(buildLine('1.17.11-unstable-0x2321bba4')).toBe('1.17.11-unstable');
    expect(buildLine('2.9.0-84caec58')).toBe('2.9.0');
    expect(buildLine('2.3.0-preview+4bcb9e30')).toBe('2.3.0-preview');
    expect(buildLine('26.10-develop-6be0cda')).toBe('26.10-develop');
  });

  it('should weight daily stats by observations and derive MGas/s from mean gas over mean duration', () => {
    const [line] = summariseBuildLines([
      {
        meta_execution_version: '2.9.0-aaaaaaaa',
        day_start_date: '2026-10-01',
        observation_count: 100,
        p50_duration_ms: 50,
        p95_duration_ms: 100,
        avg_duration_ms: 60,
        avg_gas_used: 30_000_000,
      },
      {
        meta_execution_version: '2.9.0-bbbbbbbb',
        day_start_date: '2026-10-02',
        observation_count: 300,
        p50_duration_ms: 70,
        p95_duration_ms: 140,
        avg_duration_ms: 80,
        avg_gas_used: 36_000_000,
      },
    ]);
    expect(line.line).toBe('2.9.0');
    expect(line.p50).toBeCloseTo(65);
    // (30M*100 + 36M*300) / (60*100 + 80*300) = 460,000 gas per ms = 460 MGas/s
    expect(line.mgasPerSecond).toBeCloseTo(460);
    expect(line.builds).toEqual(['2.9.0-aaaaaaaa', '2.9.0-bbbbbbbb']);
  });
});

describe('compareOpcodeCosts', () => {
  const row = (
    version: string,
    group: string,
    ns: number,
    lower: number,
    upper: number,
    gasShare = 0.01
  ): FctOpcodeCostByElClientVersion => ({
    meta_execution_version: version,
    opcode_group: group,
    block_count: 1000,
    gas_share: gasShare,
    ns_per_op: ns,
    ns_per_op_lower: lower,
    ns_per_op_upper: upper,
  });

  it('should rank changes outside both intervals first and skip rare opcodes', () => {
    const current = opcodeCosts([
      row('2.9.0-a', 'SLOAD', 50, 45, 55),
      row('2.9.0-a', 'CALL', 140, 60, 220),
      row('2.9.0-a', 'RARE', 10, 9, 11, 0.0001),
    ]);
    const previous = opcodeCosts([
      row('2.8.0-b', 'SLOAD', 100, 90, 110),
      row('2.8.0-b', 'CALL', 70, 40, 100),
      row('2.8.0-b', 'RARE', 100, 90, 110, 0.0001),
    ]);
    const changes = compareOpcodeCosts(current, previous);
    // CALL doubled but its intervals overlap, so the smaller, certain SLOAD change comes first
    expect(changes.map(change => [change.group, change.significant])).toEqual([
      ['SLOAD', true],
      ['CALL', false],
    ]);
    expect(changes[0].change).toBeCloseTo(-0.5);
  });
});

describe('opcodeRowsFromDaily', () => {
  const daily = (day: string, versions: string[], hours: number): FctOpcodeCostByElClientDaily => ({
    day_start_date: day,
    meta_execution_versions: versions,
    opcode_group: 'SLOAD',
    hour_count: hours,
    block_count: 100,
    ns_per_op: 50,
  });

  it('should keep full days on one build line', () => {
    const rows = opcodeRowsFromDaily(
      [
        // Two commits of one line: kept as that line
        daily('2026-10-28', ['2.8.1-f1cc50e4', '2.8.1-e0378eb6'], 24),
        // Upgrade day mixes two lines: its fit belongs to neither
        daily('2026-10-30', ['2.9.0-c3066914', '2.8.1-966010c9'], 24),
        daily('2026-11-01', ['2.9.0-84caec58'], 24),
        // Today, still filling
        daily('2026-11-02', ['2.9.0-84caec58'], 8),
      ],
      24
    );
    expect(rows.map(row => row.meta_execution_version)).toEqual(['2.8.1-f1cc50e4', '2.9.0-84caec58']);
  });
});

describe('release columns', () => {
  it('should take the release GitHub marks latest over the newest by date', () => {
    const flagged = [...releases, { ...release('v8.2.9', 10), is_latest: true } as ClientRelease];
    expect(latestRelease(flagged)?.version).toBe('v8.2.9');
    expect(latestRelease(releases)?.version).toBe('v8.3.2');
  });

  it('should link html_url, no page for tags without a release, and build one only when the column is missing', () => {
    expect(
      releaseUrl({
        ...releases[0],
        html_url: 'https://github.com/sigp/lighthouse/releases/tag/v8.3.2',
      } as ClientRelease)
    ).toBe('https://github.com/sigp/lighthouse/releases/tag/v8.3.2');
    expect(releaseUrl({ ...releases[0], html_url: '' } as ClientRelease)).toBeUndefined();
    expect(releaseUrl(releases[0])).toBe('https://github.com/sigp/lighthouse/releases/tag/v8.3.2');
  });

  it('should show a release name only when it says more than the version', () => {
    expect(releaseName({ ...releases[0], name: 'Fusaka Mainnet' } as ClientRelease)).toBe('Fusaka Mainnet');
    expect(releaseName({ ...releases[0], name: 'v8.3.2' } as ClientRelease)).toBeUndefined();
    expect(releaseName({ ...releases[0], name: '' } as ClientRelease)).toBeUndefined();
  });
});

describe('summariseUnresolved', () => {
  it('should group commitless reasons alone and commits by commit, weighting by block count', () => {
    const rows = toVersionCounts([
      {
        day_start_date: '2026-11-01',
        entity: 'binance',
        release_status: 'commit_zero',
        commit_prefix: '0000',
        block_count: 4,
      },
      {
        day_start_date: '2026-11-02',
        entity: 'kiln',
        release_status: 'commit_zero',
        commit_prefix: '00',
        block_count: 1,
      },
      {
        day_start_date: '2026-11-01',
        entity: 'coinbase',
        release_status: 'commit_unmatched',
        commit_prefix: 'ca93',
        block_count: 3,
      },
      {
        day_start_date: '2026-11-01',
        entity: 'coinbase',
        version: 'v8.3.2',
        release_status: 'commit_match',
        block_count: 9,
      },
    ]);
    expect(summariseUnresolved(rows)).toEqual([
      { reason: 'commit_zero', commit: undefined, blocks: 5, entities: ['binance', 'kiln'] },
      { reason: 'commit_unmatched', commit: 'ca93', blocks: 3, entities: ['coinbase'] },
    ]);
  });
});

describe('groupVersionLines', () => {
  const summary = (version: string, blocks: number): VersionSummary => ({
    version,
    blocks,
    untaggedBlocks: 0,
    share: 0,
    lastSeen: 0,
  });
  const day = (counts: Record<string, number>): VersionDay => ({
    day: '2026-01-01',
    resolved: Object.values(counts).reduce((a, b) => a + b, 0),
    unresolved: 0,
    counts: new Map(Object.entries(counts)),
  });

  it('keeps releases when the largest few cover the blocks', () => {
    const versions = [summary('v8.2.1', 90), summary('v8.2.0', 5), summary('v7.0.0', 5)];
    const result = groupVersionLines([day({ 'v8.2.1': 90 })], versions, 2);
    expect(result.level).toBe('patch');
    expect(result.versions.map(v => v.version)).toEqual(['v8.2.1', 'v8.2.0', 'v7.0.0']);
  });

  it('groups into minor lines when releases are too spread out', () => {
    const versions = [summary('v8.2.1', 30), summary('v8.2.0', 30), summary('v8.1.0', 30), summary('v7.0.0', 10)];
    const result = groupVersionLines([day({ 'v8.2.1': 3, 'v8.2.0': 4, 'v8.1.0': 5 })], versions, 2);
    expect(result.level).toBe('minor');
    expect(result.versions.map(v => [v.version, v.blocks])).toEqual([
      ['v8.2.x', 60],
      ['v8.1.x', 30],
      ['v7.0.x', 10],
    ]);
    expect(Object.fromEntries(result.days[0].counts)).toEqual({ 'v8.2.x': 7, 'v8.1.x': 5 });
  });

  it('falls back to major lines, keeping versions it cannot parse', () => {
    const versions = [summary('25.1.0', 25), summary('25.2.0', 25), summary('24.1.0', 25), summary('nightly', 25)];
    const result = groupVersionLines([], versions, 2);
    expect(result.level).toBe('major');
    expect(result.versions.map(v => v.version).sort()).toEqual(['24.x', '25.x', 'nightly']);
  });
});
