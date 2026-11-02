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

/** Version without a leading "v", so graffiti "v25.9.2" matches tag "25.9.2" */
export function normaliseVersion(version: string): string {
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

/** dim_client_release with the GitHub release columns; optional until every backend serves them */
export type ClientRelease = DimClientRelease & {
  /** GitHub release title, empty when the tag has no release */
  name?: string;
  /** GitHub release page, empty when the tag has no release */
  html_url?: string;
  /** The release GitHub marks as latest, one per client */
  is_latest?: boolean;
};

/**
 * GitHub release page of a release; tags without a release have none. Falls back to a URL built from the tag
 * where the backend does not serve html_url yet.
 */
export function releaseUrl(release: DimClientRelease | undefined): string | undefined {
  if (!release) return undefined;
  const htmlUrl = (release as ClientRelease).html_url;
  if (htmlUrl !== undefined) return htmlUrl || undefined;
  return githubReleaseUrl(release.repository, release.tag);
}

/**
 * GitHub release title, when it says more than the version.
 */
export function releaseName(release: DimClientRelease | undefined): string | undefined {
  const name = (release as ClientRelease | undefined)?.name?.trim();
  if (!name || normaliseVersion(name) === normaliseVersion(release?.version ?? '')) return undefined;
  return name;
}
