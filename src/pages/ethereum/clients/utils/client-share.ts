import type { SeriesData } from '@/components/Charts/MultiLine';
import { getClientColor } from '@/utils/ethereum';
import { formatDailyDate, formatHourlyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';

export { formatClientName };

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

/** Active client filters for the page */
export interface ClientFilters {
  consensusClient?: string;
  executionClient?: string;
}

/**
 * Records matching the client filters. `exceptLayer` skips that layer's own filter, so a breakdown or share
 * chart can show the selected client among the others instead of collapsing to 100%.
 */
export function filterRecords(
  records: ClientCountRecord[],
  filters: ClientFilters,
  exceptLayer?: ClientLayer
): ClientCountRecord[] {
  const consensus = exceptLayer === 'consensus' ? undefined : filters.consensusClient;
  const execution = exceptLayer === 'execution' ? undefined : filters.executionClient;
  if (!consensus && !execution) return records;
  return records.filter(
    record =>
      (!consensus || record.consensusClient === consensus) && (!execution || record.executionClient === execution)
  );
}

/** Entity name the validator counts give validators without a mapping */
const UNKNOWN_ENTITY = 'unknown';

/** Prefix that marks an entity filter value as a group: every entity whose name ends with the rest */
const GROUP_MARKER = '*';

/** Entities split per node operator that can also be filtered as a whole, by name suffix */
export const ENTITY_GROUPS: ReadonlyArray<{ suffix: string; label: string }> = [
  { suffix: 'lido', label: 'Lido (all node operators)' },
];

/** An entity to filter by, with its active validator count */
export interface EntityOption {
  /** Entity name, or a group value such as "*lido" */
  entity: string;
  validators: number;
  /** Display name when it differs from the entity */
  label?: string;
}

/**
 * API filter for an entity filter value: an exact match, or a suffix match for a group.
 */
export function entityQuery(entity: string): { entity_eq: string } | { entity_ends_with: string } {
  return entity.startsWith(GROUP_MARKER) ? { entity_ends_with: entity.slice(1) } : { entity_eq: entity };
}

/**
 * Display name for an entity filter value.
 */
export function entityLabel(entity: string): string {
  if (!entity.startsWith(GROUP_MARKER)) return entity;
  const suffix = entity.slice(1);
  return ENTITY_GROUPS.find(group => group.suffix === suffix)?.label ?? entity;
}

/**
 * Entities from daily per-entity validator counts, using each entity's latest day, plus a group option for each
 * entry in {@link ENTITY_GROUPS} with several members, largest first. The counts label unmapped validators
 * "unknown", which the graffiti tables leave empty, so that bucket is not offered.
 */
export function toEntityOptions(
  rows: Array<{ day_start_date?: string; entity?: string; validator_count?: number }>
): EntityOption[] {
  const latest = new Map<string, { day: string; validators: number }>();
  for (const row of rows) {
    const entity = row.entity?.trim();
    const day = row.day_start_date ?? '';
    if (!entity || entity === UNKNOWN_ENTITY) continue;
    const current = latest.get(entity);
    if (!current || day > current.day) {
      latest.set(entity, { day, validators: row.validator_count ?? 0 });
    } else if (day === current.day) {
      current.validators += row.validator_count ?? 0;
    }
  }

  const options: EntityOption[] = [...latest.entries()].map(([entity, { validators }]) => ({ entity, validators }));
  const groups = ENTITY_GROUPS.flatMap(({ suffix, label }) => {
    const members = options.filter(option => option.entity.endsWith(suffix));
    if (members.length < 2) return [];
    const validators = members.reduce((sum, member) => sum + member.validators, 0);
    return [{ entity: `${GROUP_MARKER}${suffix}`, validators, label }];
  });

  return [...groups, ...options].sort((a, b) => b.validators - a.validators || a.entity.localeCompare(b.entity));
}
