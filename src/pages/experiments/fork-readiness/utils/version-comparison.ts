export interface VersionComponents {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * Parse version string into components
 * Handles: "v" prefix, pre-release tags (rc, beta), build metadata
 * Returns: { major: number, minor: number, patch: number, prerelease?: string }
 */
export function parseVersion(version: string): VersionComponents {
  // Strip "v" prefix
  let cleanVersion = version.startsWith('v') ? version.slice(1) : version;

  // Split on pre-release delimiter (-, +)
  const prereleaseMatch = cleanVersion.match(/^([0-9.]+)[-+](.+)$/);
  let prerelease: string | undefined;

  if (prereleaseMatch) {
    cleanVersion = prereleaseMatch[1];
    prerelease = prereleaseMatch[2];
  }

  // Split version parts
  const parts = cleanVersion.split('.');
  const major = Number.parseInt(parts[0] || '0', 10);
  const minor = Number.parseInt(parts[1] || '0', 10);
  const patch = Number.parseInt(parts[2] || '0', 10);

  return {
    major,
    minor,
    patch,
    prerelease,
  };
}

/**
 * Check if prerelease tag is actually a pre-release (alpha, beta, rc) or just build metadata
 * Build metadata (commit hashes, etc.) should be ignored for version comparison
 */
function isActualPrerelease(prerelease: string): boolean {
  const lowerPrerelease = prerelease.toLowerCase();
  return lowerPrerelease.startsWith('alpha') ||
         lowerPrerelease.startsWith('beta') ||
         lowerPrerelease.startsWith('rc');
}

/**
 * Compare two semantic versions (e.g., "v25.9.2" vs "v25.9.0")
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 * Handles: "v" prefix, pre-release tags (rc, beta), build metadata
 *
 * Note: Build metadata (like commit hashes "9839f1-stateofus") is ignored for comparison.
 * Only actual pre-release tags (alpha, beta, rc) affect version ordering.
 */
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  // Compare major version
  if (version1.major !== version2.major) {
    return version1.major > version2.major ? 1 : -1;
  }

  // Compare minor version
  if (version1.minor !== version2.minor) {
    return version1.minor > version2.minor ? 1 : -1;
  }

  // Compare patch version
  if (version1.patch !== version2.patch) {
    return version1.patch > version2.patch ? 1 : -1;
  }

  // At this point, major.minor.patch are equal

  // Check if either has an actual pre-release tag (not just build metadata)
  const v1HasPrerelease = version1.prerelease && isActualPrerelease(version1.prerelease);
  const v2HasPrerelease = version2.prerelease && isActualPrerelease(version2.prerelease);

  // If both have no actual prerelease, they're equal (build metadata is ignored)
  if (!v1HasPrerelease && !v2HasPrerelease) {
    return 0;
  }

  // Version without prerelease is greater than version with prerelease
  // e.g., "v8.0.0" > "v8.0.0-rc.0"
  // But "v8.0.0-abc123" == "v8.0.0" (build metadata ignored)
  if (!v1HasPrerelease) return 1;
  if (!v2HasPrerelease) return -1;

  // Both have actual prerelease tags - compare lexicographically
  return (version1.prerelease || '').localeCompare(version2.prerelease || '');
}

/**
 * Check if version meets minimum requirement
 * Returns: true if version >= minVersion
 */
export function meetsMinVersion(version: string, minVersion: string): boolean {
  const comparison = compareVersions(version, minVersion);
  return comparison >= 0;
}
