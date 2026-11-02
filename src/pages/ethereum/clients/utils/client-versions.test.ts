import { describe, it, expect } from 'vitest';
import type { DimClientRelease, FctBlockGraffiti, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import {
  adoptionByDay,
  buildLine,
  compareOpcodeCosts,
  countVersionsByDay,
  findRelease,
  matchReleaseVersion,
  nextThreshold,
  opcodeCosts,
  peerClient,
  previousRelease,
  resolveBlocks,
  summariseBuildLines,
  timeToAdoption,
  type ResolvedBlock,
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

describe('resolveBlocks', () => {
  const row = (graffiti: Partial<FctBlockGraffiti>): FctBlockGraffiti => ({
    slot: 1,
    slot_start_date_time: 1793500000,
    consensus_client: 'lighthouse',
    execution_client: 'geth',
    ...graffiti,
  });

  it('should resolve version strings and commit prefixes, leaving unknown commits unresolved', () => {
    const resolved = resolveBlocks(
      [
        row({ consensus_client_version: 'v8.3.1' }),
        row({ consensus_client_commit: 'a376' }),
        row({ consensus_client_commit: '0000' }),
        row({}),
      ],
      'consensus',
      releases
    );
    expect(resolved.map(block => block.version)).toEqual(['v8.3.1', 'v8.3.2', null, null]);
    expect(resolved[0].day).toBe('2026-11-01');
    expect(resolved[0].partner).toBe('geth');
  });
});

describe('peerClient', () => {
  it('should read erigon peers reporting caplin as caplin', () => {
    expect(peerClient('erigon', 'caplin')).toBe('caplin');
    expect(peerClient('erigon', 'v3.8.1')).toBe('erigon');
    expect(peerClient('Lighthouse', 'v8.3.2')).toBe('lighthouse');
  });
});

const block = (time: number, version: string | null): ResolvedBlock => ({
  slot: 0,
  time,
  day: new Date(time * 1000).toISOString().slice(0, 10),
  version,
  partner: 'geth',
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

describe('timeToAdoption', () => {
  const releaseTime = 1_000_000 * 3600 + 600; // ten minutes past an hour

  // One block every 10 minutes: before release all on v8.3.0, after release every block from `switchAfter` on v8.3.1
  const series = (hours: number, switchAfter: number): ResolvedBlock[] =>
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
    expect(nextThreshold(20)?.label).toBe('⅓');
    const next = nextThreshold(40);
    expect(next?.label).toBe('½');
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
