import { describe, it, expect } from 'vitest';
import type { DimClientRelease, FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import {
  adoptionByDay,
  buildLine,
  compareOpcodeCosts,
  countVersionsByDay,
  findRelease,
  groupVersionLines,
  latestAdoption,
  latestRelease,
  matchReleaseVersion,
  onLatestByEntity,
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
  type ClientRelease,
  type VersionCount,
  type VersionDay,
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

describe('latestAdoption', () => {
  it('should divide by blocks with a known release and report how many blocks have one', () => {
    const rows = [
      { client: 'lighthouse', version: 'v8.3.2', count: 30 },
      { client: 'lighthouse', version: 'v8.3.1', count: 20 },
      // Graffiti that resolves to no release
      { client: 'lighthouse', version: null, count: 150 },
      { client: 'teku', version: '26.10.3', count: 10 },
    ];
    const latest = new Map([['lighthouse', release('v8.3.2', 1)]]);
    const result = latestAdoption(rows, latest);
    expect(result.get('lighthouse')).toEqual({ share: 60, known: 25 });
    // No known latest release
    expect(result.has('teku')).toBe(false);
  });
});

describe('onLatestByEntity', () => {
  it('counts blocks with a known release and those on the latest or newer, per entity', () => {
    const rows = [
      { entity: 'lido', version: 'v8.3.2', count: 3 },
      { entity: 'lido', version: 'v8.4.0', count: 1 },
      { entity: 'lido', version: 'v8.3.1', count: 4 },
      // Graffiti that resolves to no release
      { entity: 'lido', version: null, count: 9 },
      { entity: 'solo', version: null, count: 2 },
      { version: 'v8.3.2', count: 5 },
    ];
    const result = onLatestByEntity(rows, 'v8.3.2');
    expect(result.get('lido')).toEqual({ resolved: 8, onLatest: 4 });
    expect(result.get('solo')).toEqual({ resolved: 0, onLatest: 0 });
    expect(result.size).toBe(2);
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

  it('should take each line percentile from the window, not from the daily rows', () => {
    const lines = summariseBuildLines(
      [
        {
          meta_execution_version: '2.9.0-aaaaaaaa',
          day_start_date: '2026-10-01',
          observation_count: 100,
          p50_duration_ms: 50,
        },
        {
          meta_execution_version: '2.8.1-cccccccc',
          day_start_date: '2026-10-01',
          observation_count: 100,
          p50_duration_ms: 40,
        },
      ],
      new Map([['2.9.0', { p50: 72, p95: 150 }]])
    );
    expect(lines.map(({ line, p50, p95 }) => ({ line, p50, p95 }))).toEqual([
      { line: '2.9.0', p50: 72, p95: 150 },
      { line: '2.8.1', p50: 0, p95: 0 },
    ]);
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
        version: 'v8.3.1',
        release_status: 'commit_unmatched',
        commit_prefix: 'ca93',
        block_count: 3,
      },
      {
        day_start_date: '2026-11-01',
        entity: 'kiln',
        version: 'v8.3.2',
        release_status: 'commit_mismatch',
        commit_prefix: 'a376',
        block_count: 2,
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
      { reason: 'commit_zero', commit: undefined, stated: undefined, blocks: 5, entities: ['binance', 'kiln'] },
      { reason: 'commit_unmatched', commit: 'ca93', stated: 'v8.3.1', blocks: 3, entities: ['coinbase'] },
    ]);
    // A stated version stays out of version shares; a commit resolving to another release counts under that release
    expect(rows.filter(row => row.version).map(row => [row.version, row.count])).toEqual(
      [
        ['v8.3.2', 2],
        ['v8.3.2', 9],
      ].sort((a, b) => Number(a[1]) - Number(b[1]))
    );
  });
});

describe('groupVersionLines', () => {
  const day = (date: string, counts: Record<string, number>): VersionDay => ({
    day: date,
    resolved: Object.values(counts).reduce((a, b) => a + b, 0),
    unresolved: 0,
    counts: new Map(Object.entries(counts)),
  });

  it('keeps releases when the largest few cover the blocks', () => {
    const result = groupVersionLines(
      [day('2026-01-01', { 'v8.2.1': 90, 'v8.2.0': 5 }), day('2026-01-02', { 'v8.2.1': 90, 'v7.0.0': 5 })],
      2
    );
    expect(result.level).toBe('patch');
    expect(result.top).toEqual(['v8.2.1', 'v8.2.0']);
  });

  it('groups into minor lines when that leaves several lines', () => {
    const result = groupVersionLines(
      [
        day('2026-01-01', { 'v8.2.1': 30, 'v8.2.0': 30 }),
        day('2026-01-02', { 'v8.1.0': 30, 'v8.1.1': 20 }),
        day('2026-01-03', { 'v7.0.0': 40, 'v7.0.1': 1 }),
      ],
      3
    );
    expect(result.level).toBe('minor');
    expect(result.top.sort()).toEqual(['v7.0.x', 'v8.1.x', 'v8.2.x']);
    expect(Object.fromEntries(result.days[0].counts)).toEqual({ 'v8.2.x': 60 });
  });

  it('gives each stretch of a long window its main release', () => {
    const noise = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`v1.${40 + i}.0`, 3]));
    const era = (i: number): string => (i < 20 ? 'v1.10.0' : i < 40 ? 'v1.20.0' : 'v1.30.0');
    const days = Array.from({ length: 60 }, (_, i) =>
      day(`d${String(i).padStart(2, '0')}`, { ...noise, [era(i)]: 40 })
    );
    const { top } = groupVersionLines(days, 4);
    expect(top[0]).toBe('v1.30.0');
    expect(top).toEqual(expect.arrayContaining(['v1.10.0', 'v1.20.0']));
  });

  it('keeps the current releases of a long single-major tail apart instead of one band', () => {
    // Lodestar-like: twenty 1.x minors, each small, with peers lingering on old ones
    const old = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`v1.${10 + i}.0`, 10]));
    const days = Array.from({ length: 30 }, (_, i) =>
      day(`2026-10-${String(i + 1).padStart(2, '0')}`, {
        ...old,
        'v1.34.0': i < 20 ? 40 : 15,
        'v1.35.0': i < 20 ? 0 : 60,
      })
    );
    const result = groupVersionLines(days, 4);
    expect(result.level).toBe('patch');
    expect(result.top.slice(0, 2)).toEqual(['v1.35.0', 'v1.34.0']);
    expect(result.top.every(version => !version.endsWith('.x'))).toBe(true);
  });
});
