import type { Network } from '@/hooks/useConfig/useConfig.types';
import { getNetworkBPOs, getNetworkForks } from '@/utils/forks';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS, getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { OTHER_VERSION_COLOR, type VersionCount } from './client-versions';
import { RESOLVED_STATUSES } from '@/pages/ethereum/clients/api/client-models';
import type { ClientLayer, ClientSummary } from './client-share';

/**
 * Who counts each layer's P2P peers, as it reads after "P2P peers": consensus peers come from libp2p heartbeats and
 * identify exchanges, execution nodes from discovery records.
 */
export const PEER_SOURCE: Record<ClientLayer, string> = {
  consensus: 'our libp2p sentries saw',
  execution: 'our discovery crawler found',
};

/** Census rows carry a day and a client */
type DayRow = { day_start_date?: string; client?: string };

/** The newest day the rows cover */
export function latestDay(rows: DayRow[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    const day = row.day_start_date;
    return day && (latest === null || day > latest) ? day : latest;
  }, null);
}

/** Sum of a value over rows */
export function sum<T>(rows: T[], value: (row: T) => number | undefined): number {
  return rows.reduce((total, row) => total + (value(row) ?? 0), 0);
}

/** One version of a client in a census, with how it resolved */
export interface CensusVersion {
  /** Release version when resolved, else the version the agent reports, empty when none */
  version: string;
  resolved: boolean;
  /** Branch builds after the release */
  untagged: number;
  count: number;
  /** Peers stating this version whose commit or version string resolved to no release */
  statedOnly: number;
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
    // A peer counts under the version it states; `statedOnly` keeps apart those whose commit did not resolve to it
    const version = row.version ?? '';
    const entry = byVersion.get(version) ?? { version, resolved: false, untagged: 0, statedOnly: 0, count: 0 };
    entry.count += count(row) ?? 0;
    if (RESOLVED_STATUSES.has(row.release_status ?? '') && version) entry.resolved = true;
    else if (version) entry.statedOnly += count(row) ?? 0;
    if (row.release_status === 'commit_untagged') entry.untagged += count(row) ?? 0;
    byVersion.set(version, entry);
  }
  return [...byVersion.values()].filter(entry => entry.count > 0).sort((a, b) => b.count - a.count);
}

/**
 * Census rows as version counts for adoption: a row counts under its release only when its commit or version
 * string resolved to it. Rows that only state a version keep it as `stated`, outside every release's share.
 */
export function censusVersionCounts<T extends { day_start_date?: string; version?: string; release_status?: string }>(
  rows: T[],
  count: (row: T) => number | undefined
): VersionCount[] {
  return rows
    .filter(row => row.day_start_date && (count(row) ?? 0) > 0)
    .map(row => {
      const resolved = RESOLVED_STATUSES.has(row.release_status ?? '') && !!row.version;
      return {
        time: Date.parse(`${row.day_start_date}T00:00:00Z`) / 1000,
        day: row.day_start_date!,
        version: resolved ? row.version! : null,
        status: row.release_status || 'none',
        stated: resolved ? undefined : row.version || undefined,
        count: count(row) ?? 0,
      };
    });
}

/** Label of a network_type value */
export function networkTypeLabel(type: string | undefined): string {
  return type === 'hosting' ? 'Hosting' : 'Other';
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
  const consensus = Object.entries(network.forks.consensus ?? {}).find(([, fork]) => fork?.timestamp === point);
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

/** Agents that are not one of a layer's clients: unparsed ('other'), tools and forks; empty agents are 'unknown' */
function isLayerClient(client: string, layer: ClientLayer): boolean {
  return (
    layer === 'consensus' ? (CONSENSUS_CLIENTS as readonly string[]) : (EXECUTION_CLIENTS as readonly string[])
  ).includes(client);
}

/** One client of a layer by proposed blocks and by P2P peers */
export interface UnifiedClientRow {
  client: string;
  blocks: number;
  /** Share of blocks whose graffiti names a client of the layer (0-100), null with no such blocks */
  blockShare: number | null;
  peers: number;
  /** Share of peers with an agent (0-100), null with no peers */
  peerShare: number | null;
}

/**
 * A layer's clients with their share of proposed blocks and of P2P peers, largest by blocks then peers. Only the
 * layer's clients get rows; peers running anything else (tools, forks, unparsed agents) are summed as Other.
 * Peers without an agent count nowhere.
 */
export function unifiedClientRows(
  layer: ClientLayer,
  blockSummaries: ClientSummary[],
  peerRows: Array<{ client?: string; peer_count?: number }>
): { rows: UnifiedClientRow[]; other: { peers: number; peerShare: number | null }; peerTotal: number } {
  const peers = new Map<string, number>();
  let peerTotal = 0;
  let otherPeers = 0;
  for (const row of peerRows) {
    const client = row.client || 'unknown';
    const count = row.peer_count ?? 0;
    if (client === 'unknown') continue;
    peerTotal += count;
    if (isLayerClient(client, layer)) peers.set(client, (peers.get(client) ?? 0) + count);
    else otherPeers += count;
  }
  const blocks = new Map(
    blockSummaries
      .filter(summary => summary.identifiedShare !== null && isLayerClient(summary.client, layer))
      .map(summary => [summary.client, summary])
  );
  const peerShare = (count: number): number | null => (peerTotal > 0 ? (count / peerTotal) * 100 : null);
  const clients = new Set([...blocks.keys(), ...peers.keys()]);
  const rows = [...clients]
    .map(client => ({
      client,
      blocks: blocks.get(client)?.blocks ?? 0,
      blockShare: blocks.size > 0 ? (blocks.get(client)?.identifiedShare ?? 0) : null,
      peers: peers.get(client) ?? 0,
      peerShare: peerShare(peers.get(client) ?? 0),
    }))
    .filter(row => row.blocks > 0 || row.peers > 0)
    .sort((a, b) => b.blocks - a.blocks || b.peers - a.peers || a.client.localeCompare(b.client));
  return { rows, other: { peers: otherPeers, peerShare: peerShare(otherPeers) }, peerTotal };
}

/**
 * Daily share of P2P peers per client of a layer, stacked, for peers with an agent. Agents that are not the layer's
 * clients stack as a faint Other.
 */
export function peerShareChart(
  layer: ClientLayer,
  rows: Array<{ day_start_date?: string; client?: string; peer_count?: number }>
): { labels: string[]; days: string[]; series: SeriesData[] } {
  const byDay = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  for (const row of rows) {
    const client = row.client || 'unknown';
    if (client === 'unknown' || !row.day_start_date) continue;
    const key = isLayerClient(client, layer) ? client : 'other';
    const day = byDay.get(row.day_start_date) ?? new Map<string, number>();
    day.set(key, (day.get(key) ?? 0) + (row.peer_count ?? 0));
    byDay.set(row.day_start_date, day);
    totals.set(key, (totals.get(key) ?? 0) + (row.peer_count ?? 0));
  }
  const days = [...byDay.keys()].sort();
  const clients = [...totals.entries()]
    .sort((a, b) => Number(a[0] === 'other') - Number(b[0] === 'other') || b[1] - a[1])
    .map(([client]) => client);
  const series: SeriesData[] = clients.map(client => ({
    name: client === 'other' ? 'Other' : formatClientName(client),
    data: days.map(day => {
      const counts = byDay.get(day)!;
      const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
      return total > 0 ? Number((((counts.get(client) ?? 0) / total) * 100).toFixed(2)) : null;
    }),
    color: client === 'other' ? OTHER_VERSION_COLOR : getClientColor(client),
    stack: 'share',
    showArea: true,
    areaOpacity: client === 'other' ? 0.3 : 0.85,
    lineWidth: 0,
    showSymbol: false,
  }));
  return { days, labels: days.map(formatDailyDate), series };
}
