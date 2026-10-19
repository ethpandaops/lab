import type { SeriesData } from '@/components/Charts/MultiLine';
import { getClientColor } from '@/utils/ethereum';
import { formatDailyDate, formatHourlyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { UNKNOWN_CLIENT } from '../constants';

/** Which client layer a breakdown is for */
export type ClientLayer = 'consensus' | 'execution';

/** One aggregate row: blocks in a time bucket for a consensus and execution client pair */
export interface ClientCountRecord {
  /** Time bucket key: unix seconds for hourly buckets, YYYY-MM-DD for daily buckets */
  key: string;
  consensusClient: string;
  executionClient: string;
  blocks: number;
}

/** Block totals for one client over the selected window */
export interface ClientSummary {
  client: string;
  blocks: number;
  /** Share of all blocks (0-100) */
  share: number;
  /** Share of blocks where this layer's client was identified (0-100), null for unknown */
  identifiedShare: number | null;
}

/** Block totals for one consensus and execution client pair */
export interface ClientPairSummary {
  consensusClient: string;
  executionClient: string;
  blocks: number;
  share: number;
}

/** How many blocks named a client at all */
export interface ClientCoverage {
  total: number;
  withConsensus: number;
  withExecution: number;
  withBoth: number;
}

/** Labels and stacked series for a share-over-time chart */
export interface ShareChartConfig {
  labels: string[];
  series: SeriesData[];
}

/**
 * Normalises a client name from the API, mapping missing values to unknown.
 */
export function normaliseClient(name: string | undefined | null): string {
  const value = (name ?? '').trim().toLowerCase();
  return value === '' ? UNKNOWN_CLIENT : value;
}

/**
 * Converts hourly or daily aggregate rows into {@link ClientCountRecord}s.
 */
export function toClientCountRecords(
  rows: Array<{
    hour_start_date_time?: number;
    day_start_date?: string;
    consensus_client?: string;
    execution_client?: string;
    block_count?: number;
  }>,
  isDaily: boolean
): ClientCountRecord[] {
  return rows
    .map(row => ({
      key: isDaily ? (row.day_start_date ?? '') : String(row.hour_start_date_time ?? ''),
      consensusClient: normaliseClient(row.consensus_client),
      executionClient: normaliseClient(row.execution_client),
      blocks: row.block_count ?? 0,
    }))
    .filter(record => record.key !== '' && record.blocks > 0);
}

/**
 * Returns the client of the given layer for a record.
 */
export function clientOf(record: ClientCountRecord, layer: ClientLayer): string {
  return layer === 'consensus' ? record.consensusClient : record.executionClient;
}

/**
 * Totals blocks per client for one layer, sorted by blocks with unknown last.
 */
export function summariseClients(records: ClientCountRecord[], layer: ClientLayer): ClientSummary[] {
  const totals = new Map<string, number>();
  let total = 0;
  for (const record of records) {
    const client = clientOf(record, layer);
    totals.set(client, (totals.get(client) ?? 0) + record.blocks);
    total += record.blocks;
  }
  const identified = total - (totals.get(UNKNOWN_CLIENT) ?? 0);

  return [...totals.entries()]
    .map(([client, blocks]) => ({
      client,
      blocks,
      share: total > 0 ? (blocks / total) * 100 : 0,
      identifiedShare: client === UNKNOWN_CLIENT ? null : identified > 0 ? (blocks / identified) * 100 : 0,
    }))
    .sort((a, b) => {
      if (a.client === UNKNOWN_CLIENT) return 1;
      if (b.client === UNKNOWN_CLIENT) return -1;
      return b.blocks - a.blocks || a.client.localeCompare(b.client);
    });
}

/**
 * Totals blocks per consensus and execution client pair, largest first.
 */
export function summarisePairs(records: ClientCountRecord[]): ClientPairSummary[] {
  const totals = new Map<string, ClientPairSummary>();
  let total = 0;
  for (const record of records) {
    const id = `${record.consensusClient}|${record.executionClient}`;
    const existing = totals.get(id);
    if (existing) {
      existing.blocks += record.blocks;
    } else {
      totals.set(id, {
        consensusClient: record.consensusClient,
        executionClient: record.executionClient,
        blocks: record.blocks,
        share: 0,
      });
    }
    total += record.blocks;
  }

  return [...totals.values()]
    .map(pair => ({ ...pair, share: total > 0 ? (pair.blocks / total) * 100 : 0 }))
    .sort((a, b) => b.blocks - a.blocks);
}

/**
 * Counts how many blocks named a consensus client, an execution client, and both.
 */
export function computeCoverage(records: ClientCountRecord[]): ClientCoverage {
  const coverage: ClientCoverage = { total: 0, withConsensus: 0, withExecution: 0, withBoth: 0 };
  for (const record of records) {
    const hasConsensus = record.consensusClient !== UNKNOWN_CLIENT;
    const hasExecution = record.executionClient !== UNKNOWN_CLIENT;
    coverage.total += record.blocks;
    if (hasConsensus) coverage.withConsensus += record.blocks;
    if (hasExecution) coverage.withExecution += record.blocks;
    if (hasConsensus && hasExecution) coverage.withBoth += record.blocks;
  }
  return coverage;
}

/** Stacked per-client share (%) per bucket; identifiedOnly drops unknown and renormalises, empty buckets stay null. */
export function buildShareChartConfig(
  records: ClientCountRecord[],
  keys: string[],
  layer: ClientLayer,
  isDaily: boolean,
  identifiedOnly: boolean
): ShareChartConfig {
  const byKey = new Map<string, Map<string, number>>();
  for (const record of records) {
    const client = clientOf(record, layer);
    if (identifiedOnly && client === UNKNOWN_CLIENT) continue;
    const bucket = byKey.get(record.key) ?? new Map<string, number>();
    bucket.set(client, (bucket.get(client) ?? 0) + record.blocks);
    byKey.set(record.key, bucket);
  }

  const totals = new Map<string, number>();
  for (const [key, bucket] of byKey) {
    let total = 0;
    for (const blocks of bucket.values()) total += blocks;
    totals.set(key, total);
  }

  const clients = summariseClients(
    identifiedOnly ? records.filter(r => clientOf(r, layer) !== UNKNOWN_CLIENT) : records,
    layer
  ).map(summary => summary.client);

  const series: SeriesData[] = clients.map((client, index) => ({
    name: formatClientName(client),
    data: keys.map(key => {
      const total = totals.get(key) ?? 0;
      if (total === 0) return null;
      return Number((((byKey.get(key)?.get(client) ?? 0) / total) * 100).toFixed(2));
    }),
    color: getClientColor(client, index),
    stack: 'share',
    showArea: true,
    // Unknown stays faint so it reads as the unidentified remainder, not another client.
    areaOpacity: client === UNKNOWN_CLIENT ? 0.3 : 0.85,
    lineWidth: 0,
    showSymbol: false,
    group: layer === 'consensus' ? 'Consensus client' : 'Execution client',
  }));

  return {
    labels: keys.map(key => (isDaily ? formatDailyDate(key) : formatHourlyDate(Number(key)))),
    series,
  };
}

/** Display names for clients whose identifier does not capitalise cleanly */
const CLIENT_DISPLAY_NAMES: Record<string, string> = {
  nimbusel: 'Nimbus EL',
  ethereumjs: 'EthereumJS',
  'trin-execution': 'Trin Execution',
};

/**
 * Display name for a client: capitalised, with unknown as "Unknown".
 */
export function formatClientName(client: string): string {
  if (client === UNKNOWN_CLIENT) return 'Unknown';
  return CLIENT_DISPLAY_NAMES[client] ?? client.charAt(0).toUpperCase() + client.slice(1);
}

/** One tooltip line for a client in a time bucket */
export interface ShareTooltipItem {
  client: string;
  blocks: number;
  share: number;
}

/**
 * Client shares and block counts for one time bucket, in chart order, for the share chart tooltip.
 */
export function bucketShares(
  records: ClientCountRecord[],
  key: string,
  layer: ClientLayer,
  identifiedOnly: boolean
): { total: number; items: ShareTooltipItem[] } {
  const bucket = records.filter(
    record => record.key === key && (!identifiedOnly || clientOf(record, layer) !== UNKNOWN_CLIENT)
  );
  const summaries = summariseClients(bucket, layer);
  const total = summaries.reduce((sum, summary) => sum + summary.blocks, 0);
  return {
    total,
    items: summaries.map(summary => ({ client: summary.client, blocks: summary.blocks, share: summary.share })),
  };
}

/** Comma separated YYYY-MM-DD dates of the last `days` UTC days, for day_start_date_in_values. */
export function dailyDateValues(days: number, now: number = Date.now()): string {
  const dates: string[] = [];
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates.join(',');
}
