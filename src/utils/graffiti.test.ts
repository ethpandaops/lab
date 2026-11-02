import { describe, it, expect } from 'vitest';
import type { DimClientRelease } from '@/api/types.gen';
import { findReleaseByVersion, formatClientName, githubCommitUrl, githubReleaseUrl } from './graffiti';

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

describe('formatClientName', () => {
  it('should capitalise names and use display names where needed', () => {
    expect(formatClientName('lighthouse')).toBe('Lighthouse');
    expect(formatClientName('unknown')).toBe('Unknown');
    expect(formatClientName('nimbusel')).toBe('Nimbus EL');
    expect(formatClientName('ethereumjs')).toBe('EthereumJS');
  });
});

describe('findReleaseByVersion', () => {
  it('should match versions with or without a leading v', () => {
    const teku = [
      { ...release('25.9.2', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', null), client: 'teku' },
      { ...release('25.9.2-rc.0', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', null, true), client: 'teku' },
    ];
    expect(findReleaseByVersion(teku, 'v25.9.2')?.tag).toBe('25.9.2');
    expect(findReleaseByVersion(releases, 'v8.2.3')?.commit_sha).toBe('6db6ae9382b7d6f5bd1e0ca0d349bc0dc94adba2');
    expect(findReleaseByVersion(releases, 'v0.0.1')).toBeUndefined();
    expect(findReleaseByVersion(releases, undefined)).toBeUndefined();
  });
});

describe('github links', () => {
  it('should build release links from the exact tag', () => {
    expect(githubReleaseUrl('sigp/lighthouse', 'v8.2.3')).toBe(
      'https://github.com/sigp/lighthouse/releases/tag/v8.2.3'
    );
    expect(githubReleaseUrl('ethereumjs/ethereumjs-monorepo', '@ethereumjs/client@0.9.0')).toBe(
      'https://github.com/ethereumjs/ethereumjs-monorepo/releases/tag/%40ethereumjs/client%400.9.0'
    );
    expect(githubReleaseUrl(undefined, 'v1.0.0')).toBeUndefined();
  });

  it('should only link commits GitHub can resolve', () => {
    expect(githubCommitUrl('sigp/lighthouse', '6DB6AE9')).toBe('https://github.com/sigp/lighthouse/commit/6db6ae9');
    expect(githubCommitUrl('sigp/lighthouse', '6db6')).toBeUndefined();
    expect(githubCommitUrl(undefined, 'a579077007b98217')).toBeUndefined();
  });
});
