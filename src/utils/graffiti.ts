import type { DimClientRelease } from '@/api/types.gen';

/** Client name the graffiti models use when the graffiti names no client */
export const UNKNOWN_CLIENT = 'unknown';

/** Human readable labels for fct_block_graffiti.graffiti_format */
export const GRAFFITI_FORMAT_LABELS: Record<string, string> = {
  codes_full: 'Client codes, 8 char commits',
  codes_long: 'Client codes, 4 char commits',
  codes_short: 'Client codes, 2 char commits',
  codes_min: 'Client codes',
  version_string: 'Client version string',
  rocketpool: 'Rocket Pool default',
  none: 'Unrecognised text',
  empty: 'Empty',
};

/** Display names for clients whose identifier does not capitalise cleanly */
const CLIENT_DISPLAY_NAMES: Record<string, string> = {
  nimbusel: 'Nimbus EL',
  ethereumjs: 'EthereumJS',
  'trin-execution': 'Trin Execution',
};

/**
 * Display name for a client identifier from the graffiti models, with unknown as "Unknown".
 */
export function formatClientName(client: string): string {
  if (client === UNKNOWN_CLIENT) return 'Unknown';
  return CLIENT_DISPLAY_NAMES[client] ?? client.charAt(0).toUpperCase() + client.slice(1);
}

/** Outcome of resolving a graffiti commit prefix against a client's releases */
export type ClientReleaseResolution =
  | { status: 'resolved'; release: DimClientRelease }
  | { status: 'ambiguous'; candidates: number }
  | { status: 'unmatched' }
  | { status: 'no_commit' };

/** Resolves a commit prefix to its release; several matching commits drop post-block releases, else stay ambiguous. */
export function resolveClientRelease(
  releases: DimClientRelease[],
  commitPrefix: string | undefined,
  blockTime?: number
): ClientReleaseResolution {
  const prefix = (commitPrefix ?? '').toLowerCase();
  if (!/^[0-9a-f]{2,40}$/.test(prefix)) return { status: 'no_commit' };

  let candidates = releases.filter(release => (release.commit_sha ?? '').startsWith(prefix));
  let commits = new Set(candidates.map(release => release.commit_sha));
  if (commits.size === 0) return { status: 'unmatched' };

  if (commits.size > 1 && blockTime !== undefined) {
    const published = candidates.filter(release => release.release_date == null || release.release_date <= blockTime);
    const publishedCommits = new Set(published.map(release => release.commit_sha));
    if (publishedCommits.size === 1) {
      candidates = published;
      commits = publishedCommits;
    }
  }
  if (commits.size > 1) return { status: 'ambiguous', candidates: commits.size };

  const [release] = [...candidates].sort(
    (a, b) =>
      Number(a.prerelease ?? false) - Number(b.prerelease ?? false) ||
      (b.version ?? '').localeCompare(a.version ?? '', undefined, { numeric: true })
  );
  return { status: 'resolved', release };
}

/** Version without a leading "v", so graffiti "v25.9.2" matches tag "25.9.2" */
function normaliseVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/** Finds the release for a version taken from a default version string, preferring the full release. */
export function findReleaseByVersion(
  releases: DimClientRelease[],
  version: string | undefined
): DimClientRelease | undefined {
  if (!version) return undefined;
  const wanted = normaliseVersion(version);
  return releases
    .filter(release => normaliseVersion(release.version ?? '') === wanted)
    .sort((a, b) => Number(a.prerelease ?? false) - Number(b.prerelease ?? false))[0];
}

/** GitHub release page for a tag, keeping slashes in tags such as @ethereumjs/client@0.9.0 */
export function githubReleaseUrl(repository: string | undefined, tag: string | undefined): string | undefined {
  if (!repository || !tag) return undefined;
  return `https://github.com/${repository}/releases/tag/${tag.split('/').map(encodeURIComponent).join('/')}`;
}

/** GitHub commit page, only for prefixes of 7+ characters since GitHub does not resolve shorter ones */
export function githubCommitUrl(repository: string | undefined, commit: string | undefined): string | undefined {
  if (!repository || !commit || !/^[0-9a-f]{7,40}$/i.test(commit)) return undefined;
  return `https://github.com/${repository}/commit/${commit.toLowerCase()}`;
}
