import type { SeriesData } from '@/components/Charts/MultiLine';
import type {
  FctDataColumnCompletionByPathDaily,
  FctDataColumnCompletionByPathHourly,
  FctDataColumnPartialMessageDaily,
  FctDataColumnPartialMessageHourly,
  FctPeerPartialMessageSupportByClientDaily,
  FctPeerPartialMessageSupportByClientHourly,
} from '@/api/types.gen';
import { fillTimeKeys, formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { CONSENSUS_CLIENTS_SET, getClientColor } from '@/utils/ethereum';
import { UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';
import {
  CELL_SOURCE_COLORS,
  COMPLETION_PATHS,
  DEFAULT_SENTRY_CLIENT,
  PATH_COLORS,
  PATH_LABELS,
  VERDICT_COLORS,
} from '../constants';
import type { CompletionPath, PartialRecord, PathRecord, PeerRecord } from '../IndexPage.types';

export { formatClientName };

type PathRow = FctDataColumnCompletionByPathHourly | FctDataColumnCompletionByPathDaily;
type PartialRow = FctDataColumnPartialMessageHourly | FctDataColumnPartialMessageDaily;
type PeerHourlyRow = FctPeerPartialMessageSupportByClientHourly;
type PeerDailyRow = FctPeerPartialMessageSupportByClientDaily;

/** Time bucket key of an hourly or daily row: unix seconds or YYYY-MM-DD */
export function bucketKey(row: { hour_start_date_time?: number; day_start_date?: string }, isDaily: boolean): string {
  return isDaily ? (row.day_start_date ?? '') : String(row.hour_start_date_time ?? '');
}

/** Lower-cases a client name from the API, mapping missing values to unknown */
export function normaliseClient(name: string | undefined | null): string {
  const value = (name ?? '').trim().toLowerCase();
  return value === '' ? UNKNOWN_CLIENT : value;
}

/** Maps a completed_via value to a known completion path */
export function normalisePath(value: string | undefined): CompletionPath {
  return (COMPLETION_PATHS as readonly string[]).includes(value ?? '') ? (value as CompletionPath) : 'UNKNOWN';
}

/** Converts completion-by-path rows into {@link PathRecord}s, dropping empty buckets */
export function toPathRecords(rows: PathRow[], isDaily: boolean): PathRecord[] {
  return rows
    .map(row => ({
      key: bucketKey(row, isDaily),
      sentryClient: normaliseClient(row.meta_consensus_implementation),
      path: normalisePath(row.completed_via),
      nodes: row.node_count ?? 0,
      completions: row.completion_count ?? 0,
      cellsTotal: row.cells_total ?? 0,
      cellsFromGossip: row.cells_from_gossip ?? 0,
      cellsFromEl: row.cells_from_el ?? 0,
      avgContributingPeers: row.avg_contributing_peers ?? 0,
      p50: row.p50_completion_slot_start_diff ?? 0,
      p90: row.p90_completion_slot_start_diff ?? 0,
      p99: row.p99_completion_slot_start_diff ?? 0,
    }))
    .filter(record => record.key !== '' && record.completions > 0);
}

/** Converts partial message rows into {@link PartialRecord}s */
export function toPartialRecords(rows: PartialRow[], isDaily: boolean): PartialRecord[] {
  return rows
    .map(row => ({
      key: bucketKey(row, isDaily),
      sentryClient: normaliseClient(row.meta_consensus_implementation),
      nodes: row.node_count ?? 0,
      receivedMetadata: row.received_metadata_count ?? 0,
      receivedMessages: row.received_message_count ?? 0,
      receivedCellMessages: row.received_cell_message_count ?? 0,
      receivedCells: row.received_cells ?? 0,
      receivedHeaders: row.received_header_count ?? 0,
      cellSenderPeers: row.cell_sender_peer_count ?? 0,
      sentMetadata: row.sent_metadata_count ?? 0,
      sentMessages: row.sent_message_count ?? 0,
      sentCellMessages: row.sent_cell_message_count ?? 0,
      sentCells: row.sent_cells ?? 0,
      sentHeaders: row.sent_header_count ?? 0,
      cellsAccept: row.cells_accept_count ?? 0,
      cellsIgnore: row.cells_ignore_count ?? 0,
      cellsReject: row.cells_reject_count ?? 0,
      verdictCells: row.verdict_cells ?? 0,
      newCells: row.new_cells ?? 0,
      headerAccept: row.header_accept_count ?? 0,
      headerIgnore: row.header_ignore_count ?? 0,
      headerReject: row.header_reject_count ?? 0,
      headerNodeBlocks: row.header_node_block_count ?? 0,
      p50HeaderSeen: row.p50_header_seen_slot_start_diff ?? 0,
      p90HeaderSeen: row.p90_header_seen_slot_start_diff ?? 0,
    }))
    .filter(record => record.key !== '');
}

/** Peer client from its libp2p agent, with Erigon's embedded consensus layer named Caplin */
export function peerClient(implementation: string | undefined, version: string | undefined): string {
  const client = normaliseClient(implementation);
  return client === 'erigon' && version === 'caplin' ? 'caplin' : client;
}

/** Converts hourly peer counts, or daily averages of them, into {@link PeerRecord}s */
export function toPeerRecords(rows: Array<PeerHourlyRow | PeerDailyRow>, isDaily: boolean): PeerRecord[] {
  return rows
    .map(row => {
      if (isDaily) {
        const daily = row as PeerDailyRow;
        return {
          key: bucketKey(daily, true),
          client: peerClient(daily.peer_implementation, daily.peer_version),
          version: daily.peer_version ?? '',
          connected: daily.avg_connected_peer_count ?? 0,
          gossipsubV13: daily.avg_gossipsub_v13_peer_count ?? 0,
          subscribed: daily.avg_subscribed_peer_count ?? 0,
          requestsPartial: daily.avg_requests_partial_peer_count ?? 0,
          supportsSendingPartial: daily.avg_supports_sending_partial_peer_count ?? 0,
        };
      }
      const hourly = row as PeerHourlyRow;
      return {
        key: bucketKey(hourly, false),
        client: peerClient(hourly.peer_implementation, hourly.peer_version),
        version: hourly.peer_version ?? '',
        connected: hourly.connected_peer_count ?? 0,
        gossipsubV13: hourly.gossipsub_v13_peer_count ?? 0,
        subscribed: hourly.subscribed_peer_count ?? 0,
        requestsPartial: hourly.requests_partial_peer_count ?? 0,
        supportsSendingPartial: hourly.supports_sending_partial_peer_count ?? 0,
      };
    })
    .filter(record => record.key !== '');
}

/** Every bucket from the first to the last key, gaps included */
export function bucketKeys(keys: string[], isDaily: boolean): string[] {
  const unique = [...new Set(keys)].sort((a, b) => (isDaily ? a.localeCompare(b) : Number(a) - Number(b)));
  return fillTimeKeys(unique, isDaily);
}

/** Axis label for a bucket: date and hour for hourly buckets, date for daily ones */
export function formatBucketLabel(key: string, isDaily: boolean): string {
  if (isDaily) return formatDailyDate(key);
  const date = new Date(Number(key) * 1000);
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${time}`;
}

/** Share of a total as a percentage, or null when the total is zero */
export function shareOf(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}

/** Share of a total formatted with one decimal, or a dash when the total is zero */
export function formatShare(part: number, total: number): string {
  const share = shareOf(part, total);
  return share === null ? '-' : `${share.toFixed(1)}%`;
}

/** Milliseconds as seconds with two decimals, e.g. 1.64s */
export function formatSeconds(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || ms <= 0) return '-';
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Sentry clients with completions or partial traffic, busiest first */
export function sentryClientsOf(pathRecords: PathRecord[], partialRecords: PartialRecord[]): string[] {
  const totals = new Map<string, number>();
  for (const record of pathRecords)
    totals.set(record.sentryClient, (totals.get(record.sentryClient) ?? 0) + record.completions);
  for (const record of partialRecords) if (!totals.has(record.sentryClient)) totals.set(record.sentryClient, 0);
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([client]) => client);
}

/** The requested sentry client if present, else Lighthouse, else the busiest one */
export function pickSentryClient(clients: string[], requested?: string): string | undefined {
  if (requested && clients.includes(requested)) return requested;
  if (clients.includes(DEFAULT_SENTRY_CLIENT)) return DEFAULT_SENTRY_CLIENT;
  return clients[0];
}

/** Completion totals over a window */
export interface CompletionSummary {
  completions: number;
  byPath: Record<CompletionPath, number>;
  cellsTotal: number;
  cellsFromGossip: number;
  cellsFromEl: number;
}

/** Totals completions per path and cells per source */
export function summariseCompletions(records: PathRecord[]): CompletionSummary {
  const byPath = Object.fromEntries(COMPLETION_PATHS.map(path => [path, 0])) as Record<CompletionPath, number>;
  const summary: CompletionSummary = { completions: 0, byPath, cellsTotal: 0, cellsFromGossip: 0, cellsFromEl: 0 };
  for (const record of records) {
    summary.completions += record.completions;
    byPath[record.path] += record.completions;
    summary.cellsTotal += record.cellsTotal;
    summary.cellsFromGossip += record.cellsFromGossip;
    summary.cellsFromEl += record.cellsFromEl;
  }
  return summary;
}

/** Partial message totals over a window */
export interface PartialSummary {
  receivedCells: number;
  verdictCells: number;
  newCells: number;
  cellVerdicts: number;
  headerVerdicts: number;
  headerNodeBlocks: number;
}

/** Totals cells and verdicts over a window */
export function summarisePartials(records: PartialRecord[]): PartialSummary {
  const summary: PartialSummary = {
    receivedCells: 0,
    verdictCells: 0,
    newCells: 0,
    cellVerdicts: 0,
    headerVerdicts: 0,
    headerNodeBlocks: 0,
  };
  for (const record of records) {
    summary.receivedCells += record.receivedCells;
    summary.verdictCells += record.verdictCells;
    summary.newCells += record.newCells;
    summary.cellVerdicts += record.cellsAccept + record.cellsIgnore + record.cellsReject;
    summary.headerVerdicts += record.headerAccept + record.headerIgnore + record.headerReject;
    summary.headerNodeBlocks += record.headerNodeBlocks;
  }
  return summary;
}

/** Groups records by bucket key */
function byKey<T extends { key: string }>(records: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const record of records) {
    const bucket = grouped.get(record.key);
    if (bucket) bucket.push(record);
    else grouped.set(record.key, [record]);
  }
  return grouped;
}

/** Rounds a percentage for chart data */
function pct(part: number, total: number): number | null {
  const share = shareOf(part, total);
  return share === null ? null : Number(share.toFixed(2));
}

/** Stacked share (%) of completions per path in each bucket, paths without completions left out */
export function buildPathShareSeries(records: PathRecord[], keys: string[]): SeriesData[] {
  const grouped = byKey(records);
  const totals = new Map([...grouped].map(([key, bucket]) => [key, bucket.reduce((sum, r) => sum + r.completions, 0)]));
  const present = new Set(records.map(record => record.path));
  return COMPLETION_PATHS.filter(path => present.has(path)).map(path => ({
    name: PATH_LABELS[path],
    data: keys.map(key => {
      const bucket = grouped.get(key) ?? [];
      const completions = bucket.filter(r => r.path === path).reduce((sum, r) => sum + r.completions, 0);
      return pct(completions, totals.get(key) ?? 0);
    }),
    color: PATH_COLORS[path],
    stack: 'share',
    showArea: true,
    areaOpacity: 0.85,
    lineWidth: 0,
    showSymbol: false,
  }));
}

/** Median completion time (ms) per path in each bucket, one record per path and bucket expected */
export function buildPathLatencySeries(records: PathRecord[], keys: string[]): SeriesData[] {
  const present = new Set(records.map(record => record.path));
  return COMPLETION_PATHS.filter(path => present.has(path)).map(path => {
    const values = new Map(records.filter(r => r.path === path).map(r => [r.key, r.p50]));
    return {
      name: PATH_LABELS[path],
      data: keys.map(key => values.get(key) ?? null),
      color: PATH_COLORS[path],
      showSymbol: keys.length <= 2,
    };
  });
}

/** Stacked share (%) of completed cells by source: gossip, the execution layer, and recovered by reconstruction */
export function buildCellSourceSeries(records: PathRecord[], keys: string[]): SeriesData[] {
  const grouped = byKey(records);
  const sums = keys.map(key => {
    const bucket = grouped.get(key) ?? [];
    const total = bucket.reduce((sum, r) => sum + r.cellsTotal, 0);
    const gossip = bucket.reduce((sum, r) => sum + r.cellsFromGossip, 0);
    const el = bucket.reduce((sum, r) => sum + r.cellsFromEl, 0);
    return { total, gossip, el, recovered: Math.max(total - gossip - el, 0) };
  });
  const series: SeriesData[] = [
    { name: 'Gossip', data: sums.map(s => pct(s.gossip, s.total)), color: CELL_SOURCE_COLORS.gossip },
    { name: 'Execution layer', data: sums.map(s => pct(s.el, s.total)), color: CELL_SOURCE_COLORS.el },
    { name: 'Recovered', data: sums.map(s => pct(s.recovered, s.total)), color: CELL_SOURCE_COLORS.recovered },
  ];
  return series
    .filter(entry => entry.data.some(value => typeof value === 'number' && value > 0))
    .map(entry => ({ ...entry, stack: 'cells', showArea: true, areaOpacity: 0.85, lineWidth: 0, showSymbol: false }));
}

/** Useful cell ratio (%) as a line and received cells as bars on the secondary axis */
export function buildUsefulCellSeries(records: PartialRecord[], keys: string[]): SeriesData[] {
  const grouped = byKey(records);
  const sums = keys.map(key => {
    const bucket = grouped.get(key) ?? [];
    return {
      verdictCells: bucket.reduce((sum, r) => sum + r.verdictCells, 0),
      newCells: bucket.reduce((sum, r) => sum + r.newCells, 0),
      receivedCells: bucket.reduce((sum, r) => sum + r.receivedCells, 0),
    };
  });
  return [
    {
      name: 'Cells received',
      data: sums.map(s => (s.receivedCells > 0 ? s.receivedCells : null)),
      color: '#94a3b8',
      seriesType: 'bar',
      yAxisIndex: 1,
    },
    {
      name: 'Useful cells',
      data: sums.map(s => pct(s.newCells, s.verdictCells)),
      color: PATH_COLORS.PARTIAL_GOSSIP,
      showSymbol: keys.length <= 2,
    },
  ];
}

/** Stacked verdict counts per bucket for the cell and header checks */
export function buildVerdictSeries(records: PartialRecord[], keys: string[]): SeriesData[] {
  const grouped = byKey(records);
  const fields: Array<{ name: string; group: string; color: string; pick: (r: PartialRecord) => number }> = [
    { name: 'Cells accepted', group: 'Cells', color: VERDICT_COLORS.accept, pick: r => r.cellsAccept },
    { name: 'Cells ignored', group: 'Cells', color: VERDICT_COLORS.ignore, pick: r => r.cellsIgnore },
    { name: 'Cells rejected', group: 'Cells', color: VERDICT_COLORS.reject, pick: r => r.cellsReject },
    { name: 'Header accepted', group: 'Header', color: '#14b8a6', pick: r => r.headerAccept },
    { name: 'Header ignored', group: 'Header', color: '#64748b', pick: r => r.headerIgnore },
    { name: 'Header rejected', group: 'Header', color: '#f97316', pick: r => r.headerReject },
  ];
  return fields
    .map(field => ({
      name: field.name,
      group: field.group,
      color: field.color,
      seriesType: 'bar' as const,
      stack: 'verdicts',
      data: keys.map(key => {
        const bucket = grouped.get(key);
        return bucket ? bucket.reduce((sum, r) => sum + field.pick(r), 0) : null;
      }),
    }))
    .filter(entry => entry.data.some(value => typeof value === 'number' && value > 0));
}

/** Median and 90th percentile time (ms) nodes first received the partial column header */
export function buildHeaderSeries(records: PartialRecord[], keys: string[]): SeriesData[] {
  const withHeaders = records.filter(r => r.headerNodeBlocks > 0);
  const p50 = new Map(withHeaders.map(r => [r.key, r.p50HeaderSeen]));
  const p90 = new Map(withHeaders.map(r => [r.key, r.p90HeaderSeen]));
  return [
    { name: 'p50', data: keys.map(key => p50.get(key) ?? null), color: '#0ea5e9', showSymbol: keys.length <= 2 },
    {
      name: 'p90',
      data: keys.map(key => p90.get(key) ?? null),
      color: '#0ea5e9',
      lineStyle: 'dashed',
      showSymbol: keys.length <= 2,
    },
  ];
}

/** Whether a peer implementation is a consensus client, as opposed to crawlers, sentries and unidentified peers */
export function isConsensusClient(client: string): boolean {
  return CONSENSUS_CLIENTS_SET.has(client);
}

/** Consensus clients with subscribing peers in the window, most subscribed first */
export function adoptionClients(records: PeerRecord[]): string[] {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (isConsensusClient(record.client))
      totals.set(record.client, (totals.get(record.client) ?? 0) + record.subscribed);
  }
  return [...totals.entries()]
    .filter(([, subscribed]) => subscribed > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([client]) => client);
}

/** Share (%) of subscribing peers that requested partial messages, per consensus client and for all peers */
export function buildAdoptionSeries(records: PeerRecord[], keys: string[]): SeriesData[] {
  const grouped = byKey(records);
  const shareIn = (key: string, client?: string): number | null => {
    const bucket = (grouped.get(key) ?? []).filter(r => client === undefined || r.client === client);
    const subscribed = bucket.reduce((sum, r) => sum + r.subscribed, 0);
    const requests = bucket.reduce((sum, r) => sum + r.requestsPartial, 0);
    return pct(requests, subscribed);
  };
  const clients = adoptionClients(records);
  if (clients.length === 0) return [];
  return [
    ...clients.map((client, index) => ({
      name: formatClientName(client),
      data: keys.map(key => shareIn(key, client)),
      color: getClientColor(client, index),
      showSymbol: keys.length <= 2,
    })),
    {
      name: 'All peers',
      data: keys.map(key => shareIn(key)),
      color: '#9ca3af',
      lineStyle: 'dashed' as const,
      showSymbol: keys.length <= 2,
    },
  ];
}

/** Subscribing peers and those requesting partials in the latest bucket that saw any subscriptions */
export interface LatestAdoption {
  key: string;
  subscribed: number;
  requestsPartial: number;
}

/** Start of the bucket that contains `now`, the one still filling up */
export function currentBucketKey(isDaily: boolean, now: number = Date.now()): string {
  if (isDaily) return new Date(now).toISOString().slice(0, 10);
  return String(Math.floor(now / 1000 / 3600) * 3600);
}

/** Adoption in the latest complete bucket with subscribing peers, the current one only when it is the only one */
export function latestAdoption(
  records: PeerRecord[],
  isDaily: boolean,
  now: number = Date.now()
): LatestAdoption | null {
  const grouped = byKey(records.filter(r => r.subscribed > 0));
  const keys = [...grouped.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const current = currentBucketKey(isDaily, now);
  const complete = keys.filter(key => key !== current);
  const key = complete.at(-1) ?? keys.at(-1);
  if (key === undefined) return null;
  const bucket = grouped.get(key) ?? [];
  return {
    key,
    subscribed: bucket.reduce((sum, r) => sum + r.subscribed, 0),
    requestsPartial: bucket.reduce((sum, r) => sum + r.requestsPartial, 0),
  };
}

/** Average subscribing peers per bucket for one client version over the window */
export interface VersionSummary {
  client: string;
  version: string;
  subscribed: number;
  requestsPartial: number;
}

/** Orders version strings newest first, numerically by major.minor.patch, with unparsed versions last */
export function compareVersionsDesc(a: string, b: string): number {
  const parse = (version: string): number[] | null =>
    /^\d+(\.\d+)*$/.test(version) ? version.split('.').map(Number) : null;
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return pa ? -1 : pb ? 1 : a.localeCompare(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Consensus client versions averaged over the window's buckets with subscribing peers, grouped by client (most
 * subscribed first) and newest version first, so each client's cut-over version stands out.
 */
export function summariseVersions(records: PeerRecord[], minPeers = 1): VersionSummary[] {
  const withFlags = records.filter(r => r.subscribed > 0 && isConsensusClient(r.client));
  const buckets = new Set(records.filter(r => r.subscribed > 0).map(r => r.key)).size;
  if (buckets === 0) return [];
  const totals = new Map<string, VersionSummary>();
  for (const record of withFlags) {
    const id = `${record.client}|${record.version}`;
    const summary = totals.get(id) ?? {
      client: record.client,
      version: record.version,
      subscribed: 0,
      requestsPartial: 0,
    };
    summary.subscribed += record.subscribed;
    summary.requestsPartial += record.requestsPartial;
    totals.set(id, summary);
  }
  const clientOrder = adoptionClients(withFlags);
  return [...totals.values()]
    .map(summary => ({
      ...summary,
      subscribed: summary.subscribed / buckets,
      requestsPartial: summary.requestsPartial / buckets,
    }))
    .filter(summary => summary.subscribed >= minPeers)
    .sort(
      (a, b) =>
        clientOrder.indexOf(a.client) - clientOrder.indexOf(b.client) || compareVersionsDesc(a.version, b.version)
    );
}
