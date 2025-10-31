import { describe, it, expect } from 'vitest';

import { parseVersion, compareVersions, meetsMinVersion } from './version';

describe('parseVersion', () => {
  it('should parse version with "v" prefix', () => {
    expect(parseVersion('v1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: undefined,
    });
  });

  it('should parse version without "v" prefix', () => {
    expect(parseVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: undefined,
    });
  });

  it('should parse version with prerelease tag (hyphen delimiter)', () => {
    expect(parseVersion('v1.2.3-rc.1')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'rc.1',
    });

    expect(parseVersion('1.0.0-alpha.2')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: 'alpha.2',
    });

    expect(parseVersion('2.5.0-beta')).toEqual({
      major: 2,
      minor: 5,
      patch: 0,
      prerelease: 'beta',
    });
  });

  it('should parse version with build metadata (plus delimiter)', () => {
    expect(parseVersion('v1.2.3+abc123')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'abc123',
    });

    expect(parseVersion('v0.0.70+9839f1-stateofus')).toEqual({
      major: 0,
      minor: 0,
      patch: 70,
      prerelease: '9839f1-stateofus',
    });
  });

  it('should handle missing minor and patch versions', () => {
    expect(parseVersion('v1')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: undefined,
    });

    expect(parseVersion('v1.2')).toEqual({
      major: 1,
      minor: 2,
      patch: 0,
      prerelease: undefined,
    });
  });

  it('should handle zero versions', () => {
    expect(parseVersion('v0.0.0')).toEqual({
      major: 0,
      minor: 0,
      patch: 0,
      prerelease: undefined,
    });

    expect(parseVersion('0.0.70')).toEqual({
      major: 0,
      minor: 0,
      patch: 70,
      prerelease: undefined,
    });
  });
});

describe('compareVersions', () => {
  describe('major version differences', () => {
    it('should return 1 when v1 major > v2 major', () => {
      expect(compareVersions('v2.0.0', 'v1.0.0')).toBe(1);
      expect(compareVersions('v10.0.0', 'v9.9.9')).toBe(1);
    });

    it('should return -1 when v1 major < v2 major', () => {
      expect(compareVersions('v1.0.0', 'v2.0.0')).toBe(-1);
      expect(compareVersions('v1.9.9', 'v2.0.0')).toBe(-1);
    });
  });

  describe('minor version differences', () => {
    it('should return 1 when v1 minor > v2 minor (same major)', () => {
      expect(compareVersions('v1.2.0', 'v1.1.0')).toBe(1);
      expect(compareVersions('v5.10.0', 'v5.9.9')).toBe(1);
    });

    it('should return -1 when v1 minor < v2 minor (same major)', () => {
      expect(compareVersions('v1.1.0', 'v1.2.0')).toBe(-1);
      expect(compareVersions('v5.8.9', 'v5.9.0')).toBe(-1);
    });
  });

  describe('patch version differences', () => {
    it('should return 1 when v1 patch > v2 patch (same major.minor)', () => {
      expect(compareVersions('v1.2.3', 'v1.2.2')).toBe(1);
      expect(compareVersions('v0.0.70', 'v0.0.65')).toBe(1);
    });

    it('should return -1 when v1 patch < v2 patch (same major.minor)', () => {
      expect(compareVersions('v1.2.2', 'v1.2.3')).toBe(-1);
      expect(compareVersions('v0.0.65', 'v0.0.70')).toBe(-1);
    });
  });

  describe('equal versions', () => {
    it('should return 0 for identical versions', () => {
      expect(compareVersions('v1.2.3', 'v1.2.3')).toBe(0);
      expect(compareVersions('1.2.3', 'v1.2.3')).toBe(0);
      expect(compareVersions('0.0.70', '0.0.70')).toBe(0);
    });
  });

  describe('prerelease versions', () => {
    it('should treat stable version as greater than prerelease version', () => {
      expect(compareVersions('v1.0.0', 'v1.0.0-rc.1')).toBe(1);
      expect(compareVersions('v2.5.0', 'v2.5.0-alpha.1')).toBe(1);
      expect(compareVersions('v1.0.0', 'v1.0.0-beta')).toBe(1);
    });

    it('should treat prerelease version as less than stable version', () => {
      expect(compareVersions('v1.0.0-rc.1', 'v1.0.0')).toBe(-1);
      expect(compareVersions('v2.5.0-alpha.1', 'v2.5.0')).toBe(-1);
      expect(compareVersions('v1.0.0-beta', 'v1.0.0')).toBe(-1);
    });

    it('should compare prerelease tags lexicographically', () => {
      expect(compareVersions('v1.0.0-beta', 'v1.0.0-alpha')).toBe(1);
      expect(compareVersions('v1.0.0-rc.2', 'v1.0.0-rc.1')).toBe(1);
      expect(compareVersions('v1.0.0-alpha', 'v1.0.0-beta')).toBe(-1);
    });
  });

  describe('build metadata', () => {
    it('should ignore build metadata in comparison', () => {
      expect(compareVersions('v1.0.0+abc123', 'v1.0.0')).toBe(0);
      expect(compareVersions('v1.0.0+abc123', 'v1.0.0+def456')).toBe(0);
      expect(compareVersions('v0.0.70+9839f1', 'v0.0.70')).toBe(0);
    });

    it('should only consider actual prerelease tags, not build metadata', () => {
      // Build metadata should be treated as stable version
      expect(compareVersions('v1.0.0+abc123', 'v1.0.0-rc.1')).toBe(1);
      expect(compareVersions('v1.0.0-rc.1', 'v1.0.0+abc123')).toBe(-1);
    });
  });

  describe('mixed scenarios', () => {
    it('should handle versions without "v" prefix', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should handle contributoor version scenarios', () => {
      expect(compareVersions('v0.0.70', 'v0.0.65')).toBe(1);
      expect(compareVersions('v0.0.65', 'v0.0.70')).toBe(-1);
      expect(compareVersions('v0.1.0', 'v0.0.70')).toBe(1);
    });
  });
});

describe('meetsMinVersion', () => {
  describe('meets requirement', () => {
    it('should return true when version equals minVersion', () => {
      expect(meetsMinVersion('v1.0.0', 'v1.0.0')).toBe(true);
      expect(meetsMinVersion('v0.0.70', 'v0.0.70')).toBe(true);
      expect(meetsMinVersion('1.0.0', 'v1.0.0')).toBe(true);
    });

    it('should return true when version is greater than minVersion', () => {
      expect(meetsMinVersion('v2.0.0', 'v1.0.0')).toBe(true);
      expect(meetsMinVersion('v1.1.0', 'v1.0.0')).toBe(true);
      expect(meetsMinVersion('v1.0.1', 'v1.0.0')).toBe(true);
      expect(meetsMinVersion('v0.0.70', 'v0.0.65')).toBe(true);
      expect(meetsMinVersion('v0.1.0', 'v0.0.70')).toBe(true);
    });
  });

  describe('does not meet requirement', () => {
    it('should return false when version is less than minVersion', () => {
      expect(meetsMinVersion('v1.0.0', 'v2.0.0')).toBe(false);
      expect(meetsMinVersion('v1.0.0', 'v1.1.0')).toBe(false);
      expect(meetsMinVersion('v1.0.0', 'v1.0.1')).toBe(false);
      expect(meetsMinVersion('v0.0.65', 'v0.0.70')).toBe(false);
      expect(meetsMinVersion('v0.0.69', 'v0.0.70')).toBe(false);
    });
  });

  describe('prerelease versions', () => {
    it('should return true when stable version meets prerelease minVersion', () => {
      expect(meetsMinVersion('v1.0.0', 'v1.0.0-rc.1')).toBe(true);
      expect(meetsMinVersion('v1.0.0', 'v1.0.0-beta')).toBe(true);
    });

    it('should return false when prerelease version does not meet stable minVersion', () => {
      expect(meetsMinVersion('v1.0.0-rc.1', 'v1.0.0')).toBe(false);
      expect(meetsMinVersion('v1.0.0-beta', 'v1.0.0')).toBe(false);
    });

    it('should handle prerelease to prerelease comparisons', () => {
      expect(meetsMinVersion('v1.0.0-rc.2', 'v1.0.0-rc.1')).toBe(true);
      expect(meetsMinVersion('v1.0.0-beta', 'v1.0.0-alpha')).toBe(true);
      expect(meetsMinVersion('v1.0.0-alpha', 'v1.0.0-beta')).toBe(false);
    });
  });

  describe('build metadata', () => {
    it('should ignore build metadata when checking version requirements', () => {
      expect(meetsMinVersion('v1.0.0+abc123', 'v1.0.0')).toBe(true);
      expect(meetsMinVersion('v1.0.0', 'v1.0.0+abc123')).toBe(true);
      expect(meetsMinVersion('v0.0.70+9839f1', 'v0.0.70')).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should correctly check contributoor version requirements', () => {
      // Version 0.0.70 or later required
      expect(meetsMinVersion('v0.0.70', 'v0.0.70')).toBe(true);
      expect(meetsMinVersion('v0.0.71', 'v0.0.70')).toBe(true);
      expect(meetsMinVersion('v0.1.0', 'v0.0.70')).toBe(true);
      expect(meetsMinVersion('v0.0.69', 'v0.0.70')).toBe(false);
      expect(meetsMinVersion('v0.0.65', 'v0.0.70')).toBe(false);
    });

    it('should handle missing "v" prefix in real versions', () => {
      expect(meetsMinVersion('0.0.70', 'v0.0.70')).toBe(true);
      expect(meetsMinVersion('v0.0.70', '0.0.70')).toBe(true);
      expect(meetsMinVersion('0.0.65', 'v0.0.70')).toBe(false);
    });
  });
});
