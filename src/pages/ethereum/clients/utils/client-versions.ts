import type {
  DimClientRelease,
  FctEngineNewPayloadByElClientDaily,
  FctOpcodeCostByElClientDaily,
  FctOpcodeCostByElClientVersion,
} from '@/api/types.gen';
import { CONSENSUS_CLIENTS_SET, EXECUTION_CLIENTS_SET, normalizeClientName } from '@/utils/ethereum';
import { compareVersions } from '@/utils/version';
import { completeBucketEnd } from '@/utils/time';
import { findReleaseByVersion, normaliseVersion, type ClientRelease } from '@/utils/graffiti';
import { RESOLVED_STATUSES, type ReleaseStatus } from '../api/client-models';

export { releaseName, releaseUrl, type ClientRelease } from '@/utils/graffiti';
import type { ClientLayer } from './client-share';

/** The `version` route param that resolves to a client's newest full release */
export const LATEST_VERSION = 'latest';

/**
 * Layer of a known client, or null for names the app does not know.
 */
export function clientLayerOf(client: string): ClientLayer | null {
  const normalized = normalizeClientName(client);
  if (CONSENSUS_CLIENTS_SET.has(normalized)) return 'consensus';
  if (EXECUTION_CLIENTS_SET.has(normalized)) return 'execution';
  return null;
}

/**
 * Client a P2P peer reports: erigon's embedded consensus client identifies as erigon with version "caplin".
 */
export function peerClient(implementation: string | undefined, version: string | undefined): string {
  const client = normalizeClientName(implementation ?? '');
  if (client === 'erigon' && (version ?? '').toLowerCase().startsWith('caplin')) return 'caplin';
  return client;
}

/**
 * Releases newest first: by release date, undated last, then by version.
 */
export function sortReleases(releases: DimClientRelease[]): DimClientRelease[] {
  return [...releases].sort(
    (a, b) => (b.release_date ?? -1) - (a.release_date ?? -1) || compareVersions(b.version ?? '', a.version ?? '')
  );
}

/**
 * The client's latest release: the one GitHub marks latest, else the newest full release by release date.
 */
export function latestRelease(releases: DimClientRelease[]): DimClientRelease | undefined {
  return (
    releases.find(release => (release as ClientRelease).is_latest) ??
    sortReleases(releases).find(release => !release.prerelease && release.release_date != null)
  );
}

/**
 * Release for a version route param: "latest", or a version with or without its "v".
 */
export function findRelease(releases: DimClientRelease[], version: string): DimClientRelease | undefined {
  if (version.toLowerCase() === LATEST_VERSION) return latestRelease(releases);
  return findReleaseByVersion(releases, version);
}

/**
 * Highest full release below `release`, by version.
 */
export function previousRelease(releases: DimClientRelease[], release: DimClientRelease): DimClientRelease | undefined {
  return releases
    .filter(candidate => !candidate.prerelease && compareVersions(candidate.version ?? '', release.version ?? '') < 0)
    .sort((a, b) => compareVersions(b.version ?? '', a.version ?? ''))[0];
}

/**
 * Lowest full release above `release`, by version.
 */
export function nextRelease(releases: DimClientRelease[], release: DimClientRelease): DimClientRelease | undefined {
  return releases
    .filter(candidate => !candidate.prerelease && compareVersions(candidate.version ?? '', release.version ?? '') > 0)
    .sort((a, b) => compareVersions(a.version ?? '', b.version ?? ''))[0];
}

/** Suffixes that mark a development build rather than the release it is named after */
const DEV_BUILD = /^[-+.]?(unstable|develop|dev|preview|alpha|beta|rc|nightly|snapshot)/i;

/**
 * Release a version string reports, e.g. "v8.3.2-a376def" or "3.8.1-cf6f1413 linux" → v8.3.2 / v3.8.1.
 * Development builds ("1.17.11-unstable-…", "v8.3.0-rc.0-…" without an rc release) match nothing.
 */
export function matchReleaseVersion(
  raw: string | undefined,
  releases: DimClientRelease[]
): DimClientRelease | undefined {
  const wanted = normaliseVersion(raw ?? '').toLowerCase();
  if (!wanted) return undefined;
  const candidates = releases
    .map(release => ({ release, version: normaliseVersion(release.version ?? '').toLowerCase() }))
    .filter(({ version }) => version !== '')
    .sort(
      (a, b) =>
        b.version.length - a.version.length ||
        Number(a.release.prerelease ?? false) - Number(b.release.prerelease ?? false)
    );
  for (const { release, version } of candidates) {
    if (wanted === version) return release;
    if (!wanted.startsWith(version)) continue;
    const rest = wanted.slice(version.length);
    if (!/^[-+\s]/.test(rest) || DEV_BUILD.test(rest)) continue;
    // "26.10" must not claim "26.10.1"
    if (/^\.\d/.test(rest)) continue;
    return release;
  }
  return undefined;
}

/**
 * Release part of a version string, dropping build suffixes: "v26.10.2-0abc0d1" → "v26.10.2".
 */
export function shortVersion(version: string | undefined): string {
  return version?.trim().split(/[-+\s]/)[0] ?? '';
}

/**
 * Release version of a version string, or its short form when no release matches.
 */
export function displayVersion(raw: string | undefined, releases: DimClientRelease[]): string {
  return matchReleaseVersion(raw, releases)?.version ?? shortVersion(raw);
}

/** Why a block's version did not resolve, as release_status names it */
export type UnresolvedReason = Exclude<
  ReleaseStatus,
  'commit_match' | 'commit_untagged' | 'commit_mismatch' | 'version_match'
>;

/** Blocks sharing a time bucket, entity and version of the page's client */
export interface VersionCount {
  /** Start of the bucket (unix seconds): the block's slot time for per-block rows */
  time: number;
  /** YYYY-MM-DD (UTC) */
  day: string;
  /** Release version, or null when the graffiti did not resolve to one */
  version: string | null;
  /** How the version was resolved */
  status: string;
  /** Version the graffiti states when it resolves to no release; unverified */
  stated?: string;
  /** Client the row counts, on aggregate rows */
  client?: string;
  /** Layer of that client, on aggregate rows */
  layer?: string;
  /** Commit prefix the graffiti carried */
  commit?: string;
  entity?: string;
  count: number;
}

/** What each unresolved release_status means */
export const UNRESOLVED_LABELS: Record<string, string> = {
  no_commit: 'No commit in graffiti',
  commit_zero: 'Zero commit, such as 0000',
  codes_min: 'Client codes without commits',
  commit_short: 'Commit too short to match',
  commit_unmatched: 'Not on any upstream branch (fork or private build)',
  commit_ambiguous: 'Commit matches several releases',
  version_unmatched: 'Version string matches no release',
  none: 'No client in graffiti',
};

/** Whether a row's version builds on its release rather than being the tagged release itself */
export function isUntagged(row: Pick<VersionCount, 'status'>): boolean {
  return row.status === 'commit_untagged';
}

/** An aggregate row from the graffiti version tables */
type AggregateRow = {
  client?: string;
  layer?: string;
  day_start_date?: string;
  hour_start_date_time?: number;
  entity?: string;
  version?: string;
  commit_prefix?: string;
  release_status?: string;
  block_count?: number;
};

/**
 * Rows of the daily or hourly graffiti version tables as {@link VersionCount}s.
 */
export function toVersionCounts(rows: AggregateRow[]): VersionCount[] {
  return rows
    .filter(row => (row.block_count ?? 0) > 0)
    .map(row => {
      const time =
        row.hour_start_date_time ?? (row.day_start_date ? Date.parse(`${row.day_start_date}T00:00:00Z`) / 1000 : 0);
      const resolved = RESOLVED_STATUSES.has(row.release_status ?? '') && !!row.version;
      return {
        time,
        day: row.day_start_date ?? new Date(time * 1000).toISOString().slice(0, 10),
        version: resolved ? row.version! : null,
        status: row.release_status || 'none',
        stated: resolved ? undefined : row.version || undefined,
        client: row.client || undefined,
        layer: row.layer || undefined,
        commit: row.commit_prefix || undefined,
        entity: row.entity || undefined,
        count: row.block_count ?? 0,
      };
    });
}

/**
 * ", since <date>" when a table's data starts after the window does, so a chart does not imply history it lacks.
 */
export function sinceSuffix(dataStart: number | undefined, from: number | undefined): string {
  if (dataStart === undefined || (from !== undefined && from >= dataStart)) return '';
  return `, since ${formatDataDate(dataStart)}`;
}

/** A table's first day of data as it reads in copy, e.g. "23 Feb 2026" */
export function formatDataDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Start (unix seconds, UTC midnight) of a window of `days` complete UTC days ending yesterday */
export function windowStart(days: number, now: number = Date.now()): number {
  return completeBucketEnd('day', now) - days * 86400;
}

/** Start of the last 24 complete hours */
export function last24hStart(now: number = Date.now()): number {
  return completeBucketEnd('hour', now) - 24 * 3600;
}

/** A client's blocks over a window against its latest release */
export interface LatestAdoption {
  /** Share of its blocks with a known release that ran its latest release or newer (0-100) */
  share: number;
  /** Share of all its blocks whose graffiti resolves to a known release (0-100) */
  known: number;
}

/**
 * Per client: the share of its blocks with a known release on its latest release or newer, and how many of its
 * blocks have a known release. Clients without such blocks or a known latest release are left out.
 */
export function latestAdoption(
  rows: Array<Pick<VersionCount, 'client' | 'version' | 'count'>>,
  latest: Map<string, DimClientRelease>
): Map<string, LatestAdoption> {
  const totals = new Map<string, { all: number; resolved: number; onLatest: number }>();
  for (const row of rows) {
    if (!row.client) continue;
    const entry = totals.get(row.client) ?? { all: 0, resolved: 0, onLatest: 0 };
    entry.all += row.count;
    if (row.version) {
      entry.resolved += row.count;
      const release = latest.get(row.client)?.version;
      if (release && compareVersions(row.version, release) >= 0) entry.onLatest += row.count;
    }
    totals.set(row.client, entry);
  }
  const result = new Map<string, LatestAdoption>();
  for (const [client, entry] of totals) {
    if (entry.resolved > 0 && latest.has(client)) {
      result.set(client, { share: (entry.onLatest / entry.resolved) * 100, known: (entry.resolved / entry.all) * 100 });
    }
  }
  return result;
}

/** Blocks per version over a window */
export interface VersionSummary {
  version: string;
  blocks: number;
  /** Blocks from branch builds after the release rather than the release itself */
  untaggedBlocks: number;
  /** Share of blocks with a resolved version (0-100) */
  share: number;
  lastSeen: number;
}

/**
 * Blocks and share per resolved version, newest version first.
 */
export function summariseVersions(rows: VersionCount[]): VersionSummary[] {
  const byVersion = new Map<string, { blocks: number; untaggedBlocks: number; lastSeen: number }>();
  let resolved = 0;
  for (const block of rows) {
    if (!block.version) continue;
    resolved += block.count;
    const entry = byVersion.get(block.version) ?? {
      blocks: 0,
      untaggedBlocks: 0,
      lastSeen: 0,
    };
    entry.blocks += block.count;
    if (isUntagged(block)) entry.untaggedBlocks += block.count;
    entry.lastSeen = Math.max(entry.lastSeen, block.time);
    byVersion.set(block.version, entry);
  }
  return [...byVersion.entries()]
    .map(([version, entry]) => ({
      version,
      blocks: entry.blocks,
      untaggedBlocks: entry.untaggedBlocks,
      share: resolved > 0 ? (entry.blocks / resolved) * 100 : 0,
      lastSeen: entry.lastSeen,
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
}

/** Unresolved blocks sharing a reason and commit */
export interface UnresolvedGroup {
  reason: string;
  commit?: string;
  /** Version the graffiti states, unverified */
  stated?: string;
  blocks: number;
  /** Entities proposing them, most blocks first */
  entities: string[];
}

/** Statuses where the commit itself says nothing, so blocks group by reason alone */
const COMMITLESS_REASONS = new Set(['no_commit', 'commit_zero', 'codes_min', 'none']);

/**
 * Blocks whose version did not resolve, grouped by reason, commit and the version the graffiti states, most blocks
 * first.
 */
export function summariseUnresolved(rows: VersionCount[]): UnresolvedGroup[] {
  const groups = new Map<
    string,
    { reason: string; commit?: string; stated?: string; blocks: number; entities: Map<string, number> }
  >();
  for (const row of rows) {
    if (row.version) continue;
    const commit = COMMITLESS_REASONS.has(row.status) ? undefined : row.commit;
    const key = `${row.status}|${commit ?? ''}|${row.stated ?? ''}`;
    const group = groups.get(key) ?? { reason: row.status, commit, stated: row.stated, blocks: 0, entities: new Map() };
    group.blocks += row.count;
    if (row.entity) group.entities.set(row.entity, (group.entities.get(row.entity) ?? 0) + row.count);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(group => ({
      reason: group.reason,
      commit: group.commit,
      stated: group.stated,
      blocks: group.blocks,
      entities: [...group.entities.entries()].sort((a, b) => b[1] - a[1]).map(([entity]) => entity),
    }))
    .sort((a, b) => b.blocks - a.blocks);
}

/** Colour of versions outside the most-used ones */
export const OTHER_VERSION_COLOR = '#9ca3af';

/**
 * A colour per version for the `limit` most-used versions, newest first, so every chart on a page colours a version
 * the same way. Versions outside them are drawn as Other.
 */
export function versionColors(versions: VersionSummary[], palette: readonly string[], limit = 7): Map<string, string> {
  const top = [...versions]
    .sort((a, b) => b.blocks - a.blocks)
    .slice(0, limit)
    .map(summary => summary.version)
    .sort((a, b) => compareVersions(b, a));
  return new Map(top.map((version, index) => [version, palette[index % palette.length]]));
}

/** How finely versions are drawn: each release, or each minor line */
export type VersionLevel = 'patch' | 'minor';

/** The release line a version belongs to at `level`, e.g. v8.2.1 is v8.2.x at minor; unparseable versions stay as is */
export function versionLine(version: string, level: VersionLevel): string {
  if (level === 'patch') return version;
  const match = /^(v?)(\d+)\.(\d+)/.exec(version);
  if (!match) return version;
  return `${match[1]}${match[2]}.${match[3]}.x`;
}

/** Share of blocks the `limit` largest entries cover */
function topCoverage(counts: Map<string, number>, limit: number): number {
  const values = [...counts.values()].sort((a, b) => b - a);
  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 ? values.slice(0, limit).reduce((sum, value) => sum + value, 0) / total : 1;
}

/** The `limit` versions with the most blocks over the last `recentDays` days, so current releases are drawn */
export function recentTopVersions(days: VersionDay[], limit: number, recentDays = 7): string[] {
  const counts = new Map<string, number>();
  for (const day of days.slice(-recentDays)) {
    for (const [version, count] of day.counts) counts.set(version, (counts.get(version) ?? 0) + count);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([version]) => version);
}

/** The `limit` lines with the most recent blocks, then the main line of each stretch of the window */
function pickLines(days: VersionDay[], limit: number, recentDays = 7): string[] {
  const top = recentTopVersions(days, Math.ceil(limit / 2), recentDays);
  const segments = limit - top.length;
  for (let i = 0; i < segments; i++) {
    const counts = new Map<string, number>();
    const stretch = days.slice(
      Math.floor((i * days.length) / segments),
      Math.floor(((i + 1) * days.length) / segments)
    );
    for (const day of stretch) {
      for (const [version, count] of day.counts) {
        if (!top.includes(version)) counts.set(version, (counts.get(version) ?? 0) + count);
      }
    }
    const leader = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
    if (leader && leader[1] > 0) top.push(leader[0]);
  }
  return top;
}

/**
 * Days regrouped for a version share chart, with the lines drawn on their own (the rest stack as Other).
 *
 * Releases are drawn as they are when the `limit` largest cover `coverage` of the blocks. Otherwise they are grouped
 * into minor lines when that leaves at least three lines and merges a good share of releases, since a single-major
 * client with a long tail would otherwise become one band; never into major lines. The lines drawn are the ones with
 * the most recent blocks plus the main line of each stretch of the window, and the rest stacks as Other.
 */
export function groupVersionLines(
  days: VersionDay[],
  limit: number,
  coverage = 0.9
): { days: VersionDay[]; top: string[]; level: VersionLevel } {
  const patches = new Map<string, number>();
  const minors = new Map<string, number>();
  for (const day of days) {
    for (const [version, count] of day.counts) {
      patches.set(version, (patches.get(version) ?? 0) + count);
      const line = versionLine(version, 'minor');
      minors.set(line, (minors.get(line) ?? 0) + count);
    }
  }
  if (topCoverage(patches, limit) >= coverage) {
    return { days, top: recentTopVersions(days, limit, days.length), level: 'patch' };
  }
  const minorsHelp = minors.size >= 3 && minors.size <= patches.size * 0.6;
  if (!minorsHelp) return { days, top: pickLines(days, limit), level: 'patch' };
  const grouped = days.map(day => {
    const counts = new Map<string, number>();
    for (const [version, count] of day.counts) {
      const line = versionLine(version, 'minor');
      counts.set(line, (counts.get(line) ?? 0) + count);
    }
    return { ...day, counts };
  });
  const top =
    topCoverage(minors, limit) >= coverage
      ? recentTopVersions(grouped, limit, grouped.length)
      : pickLines(grouped, limit);
  return { days: grouped, top, level: 'minor' };
}

/** Resolved blocks per version for one UTC day */
export interface VersionDay {
  day: string;
  resolved: number;
  unresolved: number;
  counts: Map<string, number>;
}

/**
 * Version counts per UTC day, oldest first.
 */
export function countVersionsByDay(rows: VersionCount[]): VersionDay[] {
  const days = new Map<string, VersionDay>();
  for (const block of rows) {
    const entry = days.get(block.day) ?? { day: block.day, resolved: 0, unresolved: 0, counts: new Map() };
    if (block.version) {
      entry.resolved += block.count;
      entry.counts.set(block.version, (entry.counts.get(block.version) ?? 0) + block.count);
    } else {
      entry.unresolved += block.count;
    }
    days.set(block.day, entry);
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Daily share (0-100) of resolved blocks on exactly a version and on it or newer */
export interface AdoptionPoint {
  day: string;
  exact: number | null;
  atLeast: number | null;
}

/**
 * Share of each day's resolved blocks on exactly `version`, and on `version` or newer.
 */
export function adoptionByDay(days: VersionDay[], version: string): AdoptionPoint[] {
  return days.map(day => {
    if (day.resolved === 0) return { day: day.day, exact: null, atLeast: null };
    let atLeast = 0;
    for (const [candidate, count] of day.counts) {
      if (compareVersions(candidate, version) >= 0) atLeast += count;
    }
    return {
      day: day.day,
      exact: ((day.counts.get(version) ?? 0) / day.resolved) * 100,
      atLeast: (atLeast / day.resolved) * 100,
    };
  });
}

/**
 * Stat for a share on the latest day with blocks, with its change in percentage points since the first such day
 * of the window, e.g. "50.8%" and "+48.2 pts over 30d".
 */
export function shareStat(
  points: AdoptionPoint[],
  key: 'exact' | 'atLeast',
  window: string
): { value: string; delta?: { value: string; type: 'neutral' } } {
  const counted = points.map(point => point[key]).filter((share): share is number => share !== null);
  if (counted.length === 0) return { value: '-' };
  const latest = counted[counted.length - 1];
  const value = `${latest.toFixed(1)}%`;
  if (counted.length < 2) return { value };
  const change = Math.round((latest - counted[0]) * 10) / 10;
  return {
    value,
    delta: { value: `${change > 0 ? '+' : ''}${change.toFixed(1)} pts over ${window}`, type: 'neutral' },
  };
}

/** How long a release took to reach a share of blocks */
export type AdoptionLag =
  | { status: 'reached'; seconds: number }
  | { status: 'not-reached' }
  /** The blocks loaded start after the release, so the lag cannot be measured */
  | { status: 'out-of-window' };

/** Trailing window the adoption share is measured over, so one entity's burst of blocks does not count */
const LAG_WINDOW_SECONDS = 24 * 3600;
/** Fewest resolved blocks a window needs before its share counts */
const LAG_MIN_BLOCKS = 30;

/**
 * Time from release until `threshold` (0-100) of the trailing 24 hours of resolved blocks ran the release or
 * newer, checked at every hour. Takes per-block or hourly rows; an hourly row counts once its hour has passed.
 */
export function timeToAdoption(
  blocks: VersionCount[],
  version: string,
  releaseTime: number,
  threshold: number
): AdoptionLag {
  const resolved = blocks.filter(block => block.version).sort((a, b) => a.time - b.time);
  if (resolved.length === 0 || resolved[0].time > releaseTime + 3600) return { status: 'out-of-window' };

  const end = resolved[resolved.length - 1].time;
  let head = 0;
  let tail = 0;
  let total = 0;
  let atLeast = 0;
  const isAtLeast = (block: VersionCount): boolean => compareVersions(block.version ?? '', version) >= 0;

  for (let checkpoint = Math.ceil(releaseTime / 3600) * 3600; checkpoint <= end + 3600; checkpoint += 3600) {
    while (head < resolved.length && resolved[head].time < checkpoint) {
      total += resolved[head].count;
      if (isAtLeast(resolved[head])) atLeast += resolved[head].count;
      head++;
    }
    while (tail < head && resolved[tail].time < checkpoint - LAG_WINDOW_SECONDS) {
      total -= resolved[tail].count;
      if (isAtLeast(resolved[tail])) atLeast -= resolved[tail].count;
      tail++;
    }
    if (total >= LAG_MIN_BLOCKS && (atLeast / total) * 100 >= threshold) {
      return { status: 'reached', seconds: Math.max(0, checkpoint - releaseTime) };
    }
  }
  return { status: 'not-reached' };
}

/**
 * Time from release until `threshold` (0-100) of a day's resolved count ran the release or newer, from daily
 * counts: the end of the first such day on or after the release day, so it is an upper bound to the day. Days
 * starting at or after `until` are not checked.
 */
export function timeToDailyAdoption(
  days: VersionDay[],
  version: string,
  releaseTime: number,
  threshold: number,
  until: number = Infinity
): AdoptionLag {
  const counted = days.filter(day => day.resolved > 0);
  const releaseDay = new Date(releaseTime * 1000).toISOString().slice(0, 10);
  if (counted.length === 0 || counted[0].day > releaseDay) return { status: 'out-of-window' };
  for (const day of counted) {
    const start = Date.parse(`${day.day}T00:00:00Z`) / 1000;
    if (day.day < releaseDay) continue;
    if (start >= until) break;
    let atLeast = 0;
    for (const [candidate, count] of day.counts) {
      if (compareVersions(candidate, version) >= 0) atLeast += count;
    }
    if ((atLeast / day.resolved) * 100 >= threshold) {
      return { status: 'reached', seconds: Math.max(0, start + 86400 - releaseTime) };
    }
  }
  return { status: 'not-reached' };
}

/** Shares of stake at which one client's bug changes what the chain can do, drawn as faint ticks on share bars */
export const DIVERSITY_THRESHOLDS = [{ share: 100 / 3 }, { share: 50 }, { share: 200 / 3 }] as const;

/**
 * Build line of an execution client version: the version without its trailing commit,
 * e.g. "1.17.11-unstable-0x2321bba4" → "1.17.11-unstable", "2.9.0-84caec58" → "2.9.0".
 */
export function buildLine(raw: string): string {
  return raw.trim().replace(/[-+](0x)?[0-9a-f]{7,40}$/i, '');
}

/**
 * Numeric version a build line reports: "1.17.11-unstable" → "1.17.11", "26.10-develop" → "26.10".
 */
export function buildBase(raw: string): string {
  return /^v?(\d+(?:\.\d+){0,2})/i.exec(raw.trim())?.[1] ?? raw;
}

/**
 * Whether a build line reports a release's version.
 */
export function buildMatchesRelease(line: string, release: DimClientRelease | undefined): boolean {
  if (!release?.version) return false;
  return buildBase(line) === buildBase(normaliseVersion(release.version));
}

/** newPayload on the reference nodes for one build line */
export interface BuildLineStats {
  line: string;
  observations: number;
  /** Observation-weighted mean of daily medians (ms) */
  p50: number;
  /** Observation-weighted mean of daily p95s (ms) */
  p95: number;
  /** Mean gas per block divided by mean duration, in MGas/s */
  mgasPerSecond: number;
  invalid: number;
  firstDay: string;
  lastDay: string;
  builds: string[];
}

/**
 * newPayload per build line from daily rows, newest version first.
 */
export function summariseBuildLines(rows: FctEngineNewPayloadByElClientDaily[]): BuildLineStats[] {
  const lines = new Map<
    string,
    {
      observations: number;
      p50: number;
      p95: number;
      gas: number;
      duration: number;
      invalid: number;
      days: string[];
      builds: Set<string>;
    }
  >();
  for (const row of rows) {
    const raw = row.meta_execution_version ?? '';
    const observations = row.observation_count ?? 0;
    if (!raw || observations === 0) continue;
    const line = buildLine(raw);
    const entry = lines.get(line) ?? {
      observations: 0,
      p50: 0,
      p95: 0,
      gas: 0,
      duration: 0,
      invalid: 0,
      days: [],
      builds: new Set<string>(),
    };
    entry.observations += observations;
    entry.p50 += (row.p50_duration_ms ?? 0) * observations;
    entry.p95 += (row.p95_duration_ms ?? 0) * observations;
    entry.gas += (row.avg_gas_used ?? 0) * observations;
    entry.duration += (row.avg_duration_ms ?? 0) * observations;
    entry.invalid += row.invalid_count ?? 0;
    if (row.day_start_date) entry.days.push(row.day_start_date);
    entry.builds.add(raw);
    lines.set(line, entry);
  }
  return [...lines.entries()]
    .map(([line, entry]) => {
      const days = [...entry.days].sort();
      return {
        line,
        observations: entry.observations,
        p50: entry.p50 / entry.observations,
        p95: entry.p95 / entry.observations,
        mgasPerSecond: entry.duration > 0 ? entry.gas / entry.duration / 1000 : 0,
        invalid: entry.invalid,
        firstDay: days[0] ?? '',
        lastDay: days[days.length - 1] ?? '',
        builds: [...entry.builds].sort(),
      };
    })
    .sort((a, b) => compareVersions(b.line, a.line) || b.lastDay.localeCompare(a.lastDay));
}

/** Block-weighted cost of one opcode group on a build line, with its interval */
export interface OpcodeCost {
  nsPerOp: number;
  lower: number;
  upper: number;
}

/** Cost of one opcode group on two build lines */
export interface OpcodeCostChange {
  group: string;
  current: number;
  previous: number;
  /** Relative change in ns per op (-0.1 = 10% faster) */
  change: number;
  /** Whether the two builds' intervals do not overlap */
  significant: boolean;
}

/**
 * Per-version opcode rows from daily fits, for a window: keeps the days with at least `minHours` hours of fits whose
 * builds all report one build line, so each kept fit belongs to one line.
 */
export function opcodeRowsFromDaily(
  rows: FctOpcodeCostByElClientDaily[],
  minHours: number
): FctOpcodeCostByElClientVersion[] {
  return rows.flatMap(({ meta_execution_versions: versions = [], day_start_date: _day, ...row }) =>
    (row.hour_count ?? 0) >= minHours && new Set(versions.map(buildLine)).size === 1
      ? [{ ...row, meta_execution_version: versions[0] }]
      : []
  );
}

/** Opcode groups below this share of gas are too rare to cost reliably */
const MIN_OPCODE_GAS_SHARE = 0.0005;

/**
 * Block-weighted ns per op and interval for each opcode group on a set of builds, skipping rare groups.
 */
export function opcodeCosts(rows: FctOpcodeCostByElClientVersion[]): Map<string, OpcodeCost> {
  const sums = new Map<string, { ns: number; lower: number; upper: number; blocks: number }>();
  for (const row of rows) {
    const group = row.opcode_group;
    const blocks = row.block_count ?? 0;
    if (!group || row.ns_per_op == null || blocks === 0 || (row.gas_share ?? 0) < MIN_OPCODE_GAS_SHARE) continue;
    const entry = sums.get(group) ?? { ns: 0, lower: 0, upper: 0, blocks: 0 };
    entry.ns += row.ns_per_op * blocks;
    entry.lower += (row.ns_per_op_lower ?? row.ns_per_op) * blocks;
    entry.upper += (row.ns_per_op_upper ?? row.ns_per_op) * blocks;
    entry.blocks += blocks;
    sums.set(group, entry);
  }
  return new Map(
    [...sums.entries()].map(([group, entry]) => [
      group,
      { nsPerOp: entry.ns / entry.blocks, lower: entry.lower / entry.blocks, upper: entry.upper / entry.blocks },
    ])
  );
}

/**
 * Opcode groups costed on both lines, significant changes first, then by size of change.
 */
export function compareOpcodeCosts(
  current: Map<string, OpcodeCost>,
  previous: Map<string, OpcodeCost>
): OpcodeCostChange[] {
  return [...current.entries()]
    .filter(([group, cost]) => (previous.get(group)?.nsPerOp ?? 0) > 0 && cost.nsPerOp > 0)
    .map(([group, cost]) => {
      const before = previous.get(group)!;
      return {
        group,
        current: cost.nsPerOp,
        previous: before.nsPerOp,
        change: cost.nsPerOp / before.nsPerOp - 1,
        significant: cost.lower > before.upper || cost.upper < before.lower,
      };
    })
    .sort((a, b) => Number(b.significant) - Number(a.significant) || Math.abs(b.change) - Math.abs(a.change));
}

/**
 * Human duration for an adoption lag, e.g. "18 hours" or "6 days".
 */
export function formatLag(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  if (hours < 48) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.round(seconds / 86400);
  return `${days} days`;
}

/**
 * Duration for an adoption lag measured from daily counts, in whole days rounded up, e.g. "1 day" or "6 days".
 */
export function formatDayLag(seconds: number): string {
  const days = Math.max(1, Math.ceil(seconds / 86400));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
