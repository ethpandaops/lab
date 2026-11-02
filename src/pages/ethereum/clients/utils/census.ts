import type { Network } from '@/hooks/useConfig/useConfig.types';
import { getNetworkBPOs, getNetworkForks } from '@/utils/forks';
import { RESOLVED_STATUSES } from '../api/client-models';
import type { ClientSummary } from './client-share';

/** Census rows carry a day and a client */
type DayRow = { day_start_date?: string; client?: string };

/**
 * The newest day the rows cover, skipping today when an earlier day exists, since today is still filling.
 */
export function latestFullDay(rows: DayRow[], today: string = new Date().toISOString().slice(0, 10)): string | null {
  const days = [...new Set(rows.map(row => row.day_start_date ?? ''))].filter(Boolean).sort();
  if (days.length === 0) return null;
  const last = days[days.length - 1];
  return last === today && days.length > 1 ? days[days.length - 2] : last;
}

/** Sum of a value over rows */
export function sum<T>(rows: T[], value: (row: T) => number | undefined): number {
  return rows.reduce((total, row) => total + (value(row) ?? 0), 0);
}

/**
 * Per-client totals of one day as {@link ClientSummary}s, largest first, for the diversity cards. Rows for unknown
 * and other agents count towards the total but are not listed.
 */
export function censusSummaries<T extends DayRow>(rows: T[], count: (row: T) => number | undefined): ClientSummary[] {
  const totals = new Map<string, number>();
  let all = 0;
  for (const row of rows) {
    const value = count(row) ?? 0;
    all += value;
    const client = row.client ?? 'unknown';
    if (client === 'unknown' || client === 'other') continue;
    totals.set(client, (totals.get(client) ?? 0) + value);
  }
  const identified = [...totals.values()].reduce((total, value) => total + value, 0);
  return [...totals.entries()]
    .map(([client, blocks]) => ({
      client,
      blocks,
      share: all > 0 ? (blocks / all) * 100 : 0,
      identifiedShare: identified > 0 ? (blocks / identified) * 100 : 0,
    }))
    .sort((a, b) => b.blocks - a.blocks);
}

/** One version of a client in a census, with how it resolved */
export interface CensusVersion {
  /** Release version when resolved, else the version the agent reports, empty when none */
  version: string;
  resolved: boolean;
  /** Branch builds after the release */
  untagged: number;
  count: number;
}

/**
 * A client's census rows grouped by version, most counted first.
 */
export function censusVersions<T extends { version?: string; release_status?: string }>(
  rows: T[],
  count: (row: T) => number | undefined
): CensusVersion[] {
  const byVersion = new Map<string, CensusVersion>();
  for (const row of rows) {
    const resolved = RESOLVED_STATUSES.has(row.release_status ?? '') && !!row.version;
    const version = row.version ?? '';
    const key = `${resolved}|${version}`;
    const entry = byVersion.get(key) ?? { version, resolved, untagged: 0, count: 0 };
    entry.count += count(row) ?? 0;
    if (row.release_status === 'commit_untagged') entry.untagged += count(row) ?? 0;
    byVersion.set(key, entry);
  }
  return [...byVersion.values()].filter(entry => entry.count > 0).sort((a, b) => b.count - a.count);
}

/** Label of a network_type value */
export function networkTypeLabel(type: string | undefined): string {
  if (type === 'hosting') return 'Hosting';
  return 'Other (mostly residential or business ISP)';
}

/** What a custody bucket means */
export const CUSTODY_BUCKETS = [
  { key: 'custody_4_peer_count', label: '4 groups', meaning: 'No validators, or not reported' },
  { key: 'custody_5_8_peer_count', label: '5–8 groups', meaning: 'At least one validator' },
  { key: 'custody_9_127_peer_count', label: '9–127 groups', meaning: 'More validators' },
  { key: 'custody_128_peer_count', label: '128 groups', meaning: 'Supernode, or 4096 ETH or more attached' },
] as const;

/** The next fork after an epoch, from the network config: a named fork or a blob parameter change */
export function upcomingFork(
  network: Network | null | undefined,
  epoch: number
): { name: string; slug: string } | null {
  if (!network) return null;
  const forks = getNetworkForks(network, epoch)
    .filter(fork => fork.epoch > epoch)
    .map(fork => ({ epoch: fork.epoch, name: fork.displayName, slug: fork.combinedName ?? fork.name }));
  const bpos = getNetworkBPOs(network, epoch)
    .filter(bpo => bpo.epoch > epoch)
    .map(bpo => ({ epoch: bpo.epoch, name: bpo.displayName, slug: bpo.slug }));
  const next = [...forks, ...bpos].sort((a, b) => a.epoch - b.epoch)[0];
  return next ? { name: next.name, slug: next.slug } : null;
}

/** Nodes advertising a next fork, grouped */
export interface NextForkGroup {
  /** Fork name, "No fork scheduled", or the raw value when it maps to no known fork */
  label: string;
  /** Whether this is the network's next fork */
  isNext: boolean;
  count: number;
}

/**
 * Groups consensus ENRs by the next fork digest they advertise. Digests cannot be derived from the config, so the
 * most advertised digest is taken as the network's next fork when one is scheduled.
 */
export function groupNextForkDigests<T extends { next_fork_digest?: string; node_count?: number }>(
  rows: T[],
  next: { name: string } | null
): NextForkGroup[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const digest = row.next_fork_digest ?? '';
    counts.set(digest, (counts.get(digest) ?? 0) + (row.node_count ?? 0));
  }
  const scheduled = [...counts.entries()].filter(([digest]) => digest !== '').sort((a, b) => b[1] - a[1]);
  const dominant = next ? scheduled[0]?.[0] : undefined;
  return [...counts.entries()]
    .map(([digest, count]) => ({
      label: digest === '' ? 'No fork scheduled' : digest === dominant ? next!.name : digest,
      isNext: digest !== '' && digest === dominant,
      count,
    }))
    .sort((a, b) => Number(b.isNext) - Number(a.isNext) || b.count - a.count);
}

/** Display name of a consensus fork, using the combined name (e.g. Fusaka) when it has one */
function forkDisplayName(network: Network, name: string): string {
  const fork = getNetworkForks(network).find(item => item.name === name);
  const label = fork?.combinedName ?? fork?.displayName ?? name;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Name of the fork an execution ENR's fork_id_next points at: a timestamp after the merge, a block before it.
 */
export function forkIdNextLabel(value: string | undefined, network: Network | null | undefined): string {
  if (!value) return 'No fork scheduled';
  const point = Number(value);
  if (!network || !Number.isFinite(point)) return value;
  const consensus = Object.entries(network.forks.consensus).find(([, fork]) => fork?.timestamp === point);
  if (consensus) return forkDisplayName(network, consensus[0]);
  const execution = Object.entries(network.forks.execution ?? {}).find(
    ([, fork]) => fork?.block === point || fork?.timestamp === point
  );
  if (execution) return execution[0].charAt(0).toUpperCase() + execution[0].slice(1).replace(/_/g, ' ');
  return value;
}

/**
 * Groups execution ENRs by the fork their fork_id_next points at; the network's next fork is the one at the earliest
 * future timestamp in the config.
 */
export function groupForkIdNext<T extends { fork_id_next?: string; node_count?: number }>(
  rows: T[],
  network: Network | null | undefined,
  now: number = Date.now() / 1000
): NextForkGroup[] {
  const nextTimestamp = Object.values(network?.forks.consensus ?? {})
    .map(fork => fork?.timestamp ?? 0)
    .filter(timestamp => timestamp > now)
    .sort((a, b) => a - b)[0];
  const groups = new Map<string, NextForkGroup>();
  for (const row of rows) {
    const value = row.fork_id_next ?? '';
    const label = forkIdNextLabel(value, network);
    const isNext = !!nextTimestamp && Number(value) === nextTimestamp;
    const group = groups.get(label) ?? { label, isNext, count: 0 };
    group.count += row.node_count ?? 0;
    groups.set(label, group);
  }
  return [...groups.values()].sort((a, b) => Number(b.isNext) - Number(a.isNext) || b.count - a.count);
}
