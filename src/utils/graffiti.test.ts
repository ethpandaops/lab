import { describe, it, expect } from 'vitest';
import type { DimClientRelease } from '@/api/types.gen';
import { formatClientName, resolveClientRelease } from './graffiti';

const release = (
  version: string,
  commit: string,
  releaseDate: number | null,
  prerelease = false
): DimClientRelease => ({
  client: 'lighthouse',
  layer: 'consensus',
  version,
  tag: version,
  commit_sha: commit,
  release_date: releaseDate,
  prerelease,
});

const releases = [
  release('v8.2.3', '6db6ae9382b7d6f5bd1e0ca0d349bc0dc94adba2', 1_792_000_000),
  release('v8.2.2', 'e423a66763bb1bd780492d635123f208d80c3538', 1_791_000_000),
  release('v8.3.0-rc.0', '4920af726c9999399c7678d4dce9d1f45d0383a1', 1_791_500_000, true),
  release('v8.3.0', '4920af726c9999399c7678d4dce9d1f45d0383a1', 1_793_000_000),
  release('v1.0.0', 'e4ffffffffffffffffffffffffffffffffffffff', 1_600_000_000),
  release('v9.0.0', 'e400000000000000000000000000000000000000', 1_900_000_000),
];

describe('resolveClientRelease', () => {
  it('should resolve a prefix that matches one release commit', () => {
    expect(resolveClientRelease(releases, '6db6')).toMatchObject({
      status: 'resolved',
      release: { version: 'v8.2.3' },
    });
    expect(resolveClientRelease(releases, '6DB6AE9')).toMatchObject({ status: 'resolved' });
  });

  it('should prefer the full release over a pre-release on the same commit', () => {
    expect(resolveClientRelease(releases, '4920')).toMatchObject({ release: { version: 'v8.3.0' } });
  });

  it('should report prefixes matching several commits as ambiguous', () => {
    expect(resolveClientRelease(releases, 'e4')).toEqual({ status: 'ambiguous', candidates: 3 });
  });

  it('should drop releases published after the block when that leaves one commit', () => {
    const narrowed = releases.filter(r => r.version !== 'v1.0.0');
    expect(resolveClientRelease(narrowed, 'e4', 1_792_500_000)).toMatchObject({
      status: 'resolved',
      release: { version: 'v8.2.2' },
    });
  });

  it('should report unmatched and missing commits', () => {
    expect(resolveClientRelease(releases, 'abcd')).toEqual({ status: 'unmatched' });
    expect(resolveClientRelease(releases, '')).toEqual({ status: 'no_commit' });
    expect(resolveClientRelease(releases, 'Loca')).toEqual({ status: 'no_commit' });
  });
});

describe('formatClientName', () => {
  it('should capitalise names and use display names where needed', () => {
    expect(formatClientName('lighthouse')).toBe('Lighthouse');
    expect(formatClientName('unknown')).toBe('Unknown');
    expect(formatClientName('nimbusel')).toBe('Nimbus EL');
    expect(formatClientName('ethereumjs')).toBe('EthereumJS');
  });
});
