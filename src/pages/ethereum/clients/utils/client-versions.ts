import type {
  DimClientRelease,
  FctBlockGraffiti,
  FctEngineNewPayloadByElClientDaily,
  FctOpcodeCostByElClientVersion,
} from '@/api/types.gen';
import { CONSENSUS_CLIENTS_SET, EXECUTION_CLIENTS_SET, normalizeClientName } from '@/utils/ethereum';
import { compareVersions } from '@/utils/version';
import {
  UNKNOWN_CLIENT,
  findReleaseByVersion,
  normaliseVersion,
  resolveClientRelease,
  type ClientRelease,
} from '@/utils/graffiti';

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

/** One proposed block with the version of the page's client resolved */
export interface ResolvedBlock {
  slot: number;
  time: number;
  /** YYYY-MM-DD (UTC) */
  day: string;
  /** Release version, or null when the graffiti did not resolve to one */
  version: string | null;
  entity?: string;
  /** Client of the other layer */
  partner: string;
  /** Commit or version the partner's graffiti carried */
  partnerDetail?: string;
}

/**
 * Resolves the page client's release for every block from its graffiti: a version string matches by version,
 * a commit prefix by commit. Commits shared by several releases resolve by release date, else stay unresolved.
 */
export function resolveBlocks(
  rows: FctBlockGraffiti[],
  layer: ClientLayer,
  releases: DimClientRelease[]
): ResolvedBlock[] {
  const byCommit = new Map<string, ReturnType<typeof resolveClientRelease>>();
  const byVersion = new Map<string, string | null>();

  return rows.map(row => {
    const time = row.slot_start_date_time ?? 0;
    const commit = ((layer === 'consensus' ? row.consensus_client_commit : row.execution_client_commit) ?? '')
      .trim()
      .toLowerCase();
    const graffitiVersion = layer === 'consensus' ? row.consensus_client_version?.trim() : undefined;

    let version: string | null = null;
    if (graffitiVersion) {
      if (!byVersion.has(graffitiVersion)) {
        byVersion.set(graffitiVersion, findReleaseByVersion(releases, graffitiVersion)?.version ?? graffitiVersion);
      }
      version = byVersion.get(graffitiVersion) ?? null;
    } else if (commit) {
      let resolution = byCommit.get(commit);
      if (!resolution) {
        resolution = resolveClientRelease(releases, commit);
        byCommit.set(commit, resolution);
      }
      if (resolution.status === 'ambiguous') resolution = resolveClientRelease(releases, commit, time);
      if (resolution.status === 'resolved') version = resolution.release.version ?? null;
    }

    const partner = layer === 'consensus' ? row.execution_client : row.consensus_client;
    return {
      slot: row.slot ?? 0,
      time,
      day: new Date(time * 1000).toISOString().slice(0, 10),
      version,
      entity: row.entity || undefined,
      partner: (partner ?? '').trim().toLowerCase() || UNKNOWN_CLIENT,
      partnerDetail:
        (layer === 'consensus'
          ? row.execution_client_commit
          : row.consensus_client_version || row.consensus_client_commit) || undefined,
    };
  });
}

/** Blocks per version over a window */
export interface VersionSummary {
  version: string;
  blocks: number;
  /** Share of blocks with a resolved version (0-100) */
  share: number;
  entities: number;
  lastSeen: number;
}

/**
 * Blocks, share and entity count per resolved version, newest version first.
 */
export function summariseVersions(blocks: ResolvedBlock[]): VersionSummary[] {
  const byVersion = new Map<string, { blocks: number; entities: Set<string>; lastSeen: number }>();
  let resolved = 0;
  for (const block of blocks) {
    if (!block.version) continue;
    resolved++;
    const entry = byVersion.get(block.version) ?? { blocks: 0, entities: new Set<string>(), lastSeen: 0 };
    entry.blocks++;
    if (block.entity) entry.entities.add(block.entity);
    entry.lastSeen = Math.max(entry.lastSeen, block.time);
    byVersion.set(block.version, entry);
  }
  return [...byVersion.entries()]
    .map(([version, entry]) => ({
      version,
      blocks: entry.blocks,
      share: resolved > 0 ? (entry.blocks / resolved) * 100 : 0,
      entities: entry.entities.size,
      lastSeen: entry.lastSeen,
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
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
export function countVersionsByDay(blocks: ResolvedBlock[]): VersionDay[] {
  const days = new Map<string, VersionDay>();
  for (const block of blocks) {
    const entry = days.get(block.day) ?? { day: block.day, resolved: 0, unresolved: 0, counts: new Map() };
    if (block.version) {
      entry.resolved++;
      entry.counts.set(block.version, (entry.counts.get(block.version) ?? 0) + 1);
    } else {
      entry.unresolved++;
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
 * newer, checked at every hour.
 */
export function timeToAdoption(
  blocks: ResolvedBlock[],
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
  const isAtLeast = (block: ResolvedBlock): boolean => compareVersions(block.version ?? '', version) >= 0;

  for (let checkpoint = Math.ceil(releaseTime / 3600) * 3600; checkpoint <= end + 3600; checkpoint += 3600) {
    while (head < resolved.length && resolved[head].time < checkpoint) {
      total++;
      if (isAtLeast(resolved[head])) atLeast++;
      head++;
    }
    while (tail < head && resolved[tail].time < checkpoint - LAG_WINDOW_SECONDS) {
      total--;
      if (isAtLeast(resolved[tail])) atLeast--;
      tail++;
    }
    if (total >= LAG_MIN_BLOCKS && (atLeast / total) * 100 >= threshold) {
      return { status: 'reached', seconds: Math.max(0, checkpoint - releaseTime) };
    }
  }
  return { status: 'not-reached' };
}

/** Client diversity thresholds: shares of stake at which one client's bug changes what the chain can do */
export const DIVERSITY_THRESHOLDS = [
  { share: 100 / 3, label: '⅓' },
  { share: 50, label: '½' },
  { share: 200 / 3, label: '⅔' },
] as const;

/**
 * The lowest diversity threshold above a share, with how far below it the share sits (percentage points).
 */
export function nextThreshold(share: number): { label: string; share: number; distance: number } | null {
  const next = DIVERSITY_THRESHOLDS.find(threshold => share < threshold.share);
  return next ? { label: next.label, share: next.share, distance: next.share - share } : null;
}

/**
 * Highest diversity threshold a share is over, or null below ⅓.
 */
export function crossedThreshold(share: number): string | null {
  const crossed = DIVERSITY_THRESHOLDS.filter(threshold => share >= threshold.share);
  return crossed.length > 0 ? crossed[crossed.length - 1].label : null;
}

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
