import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctAttestationObservationByNodeDailyServiceList,
  fctAttestationObservationByNodeHourlyServiceList,
  fctBlockDataColumnSidecarFirstSeenByNodeDailyServiceList,
  fctBlockDataColumnSidecarFirstSeenByNodeHourlyServiceList,
  fctBlockFirstSeenByNodeDailyServiceList,
  fctBlockFirstSeenByNodeHourlyServiceList,
  fctEngineGetBlobsByNodeDailyServiceList,
  fctEngineGetBlobsByNodeHourlyServiceList,
  fctEngineNewPayloadByNodeDailyServiceList,
  fctEngineNewPayloadByNodeHourlyServiceList,
  fctHeadFirstSeenByNodeDailyServiceList,
  fctHeadFirstSeenByNodeHourlyServiceList,
} from '@/api/sdk.gen';
import type {
  FctAttestationObservationByNodeHourly,
  FctBlockDataColumnSidecarFirstSeenByNodeHourly,
  FctBlockFirstSeenByNodeHourly,
  FctEngineGetBlobsByNodeHourly,
  FctEngineNewPayloadByNodeHourly,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { NODE_RANGE_CONFIG, type Granularity, type NodeRange } from '../constants';
import { getBuckets, parseBucket, toDateString } from '../utils/time-buckets';

/** Rollup family: block, head and attestation arrival, data column completion, engine API calls */
export type HistoryMetric = 'block' | 'head' | 'attestation' | 'dataColumn' | 'newPayload' | 'getBlobs';

/** One node's summary for one hour or day, in milliseconds */
export interface HistoryRow {
  start: number;
  nodeId: string;
  username: string;
  /** Consensus client, or execution client for engine metrics */
  client: string;
  clientVersion?: string;
  /** Slots (or engine calls) the summary covers */
  count: number;
  p10: number | null;
  p50: number;
  p90: number | null;
  p95: number | null;
  /** Data columns: median arrival of the first column in a slot */
  firstP50?: number;
  /** Data columns: custody set size */
  columns?: number;
  /** Engine calls that returned something other than VALID */
  notValid?: number;
  /** getBlobs: blobs requested and returned */
  requested?: number;
  returned?: number;
}

/** Hourly and daily rows share their columns apart from the bucket column */
type RawRow = { hour_start_date_time?: number; day_start_date?: string };

type ListFn = Parameters<typeof fetchAllPages>[0];

const SOURCES: Record<
  HistoryMetric,
  { table: string; hourly: ListFn; daily: ListFn; normalize: (row: RawRow) => Omit<HistoryRow, 'start'> }
> = {
  block: {
    table: 'fct_block_first_seen_by_node',
    hourly: fctBlockFirstSeenByNodeHourlyServiceList as ListFn,
    daily: fctBlockFirstSeenByNodeDailyServiceList as ListFn,
    normalize: arrival,
  },
  head: {
    table: 'fct_head_first_seen_by_node',
    hourly: fctHeadFirstSeenByNodeHourlyServiceList as ListFn,
    daily: fctHeadFirstSeenByNodeDailyServiceList as ListFn,
    normalize: arrival,
  },
  attestation: {
    table: 'fct_attestation_observation_by_node',
    hourly: fctAttestationObservationByNodeHourlyServiceList as ListFn,
    daily: fctAttestationObservationByNodeDailyServiceList as ListFn,
    normalize: (row: FctAttestationObservationByNodeHourly) => ({
      ...identity(row),
      count: row.slot_count ?? 0,
      p10: row.p10_median_seen_slot_start_diff ?? null,
      p50: row.p50_median_seen_slot_start_diff ?? 0,
      p90: row.p90_median_seen_slot_start_diff ?? null,
      p95: row.p95_median_seen_slot_start_diff ?? null,
    }),
  },
  dataColumn: {
    table: 'fct_block_data_column_sidecar_first_seen_by_node',
    hourly: fctBlockDataColumnSidecarFirstSeenByNodeHourlyServiceList as ListFn,
    daily: fctBlockDataColumnSidecarFirstSeenByNodeDailyServiceList as ListFn,
    normalize: (row: FctBlockDataColumnSidecarFirstSeenByNodeHourly) => ({
      ...identity(row),
      count: row.slot_count ?? 0,
      p10: row.p10_last_seen_slot_start_diff ?? null,
      p50: row.p50_last_seen_slot_start_diff ?? 0,
      p90: row.p90_last_seen_slot_start_diff ?? null,
      p95: row.p95_last_seen_slot_start_diff ?? null,
      firstP50: row.p50_first_seen_slot_start_diff,
      columns: row.column_count,
    }),
  },
  newPayload: {
    table: 'fct_engine_new_payload_by_node',
    hourly: fctEngineNewPayloadByNodeHourlyServiceList as ListFn,
    daily: fctEngineNewPayloadByNodeDailyServiceList as ListFn,
    normalize: (row: FctEngineNewPayloadByNodeHourly) => ({
      nodeId: row.node_id ?? '',
      username: row.username ?? '',
      client: row.meta_execution_implementation ?? '',
      clientVersion: row.meta_execution_version,
      count: row.call_count ?? 0,
      p10: null,
      p50: row.p50_duration_ms ?? 0,
      p90: row.p90_duration_ms ?? null,
      p95: row.p95_duration_ms ?? null,
      notValid: (row.call_count ?? 0) - (row.valid_count ?? 0),
    }),
  },
  getBlobs: {
    table: 'fct_engine_get_blobs_by_node',
    hourly: fctEngineGetBlobsByNodeHourlyServiceList as ListFn,
    daily: fctEngineGetBlobsByNodeDailyServiceList as ListFn,
    normalize: (row: FctEngineGetBlobsByNodeHourly) => ({
      nodeId: row.node_id ?? '',
      username: row.username ?? '',
      client: row.meta_execution_implementation ?? '',
      count: row.call_count ?? 0,
      p10: null,
      p50: row.p50_duration_ms ?? 0,
      p90: row.p90_duration_ms ?? null,
      p95: row.p95_duration_ms ?? null,
      requested: row.requested_count ?? 0,
      returned: row.returned_count ?? 0,
    }),
  },
} as never;

function identity(row: { node_id?: string; username?: string; meta_consensus_implementation?: string }): {
  nodeId: string;
  username: string;
  client: string;
} {
  return { nodeId: row.node_id ?? '', username: row.username ?? '', client: row.meta_consensus_implementation ?? '' };
}

function arrival(row: FctBlockFirstSeenByNodeHourly): Omit<HistoryRow, 'start'> {
  return {
    ...identity(row),
    count: row.slot_count ?? 0,
    p10: row.p10_seen_slot_start_diff ?? null,
    p50: row.p50_seen_slot_start_diff ?? 0,
    p90: row.p90_seen_slot_start_diff ?? null,
    p95: row.p95_seen_slot_start_diff ?? null,
  };
}

/** Which nodes to read: one node, one contributor's nodes, or every node */
export interface HistoryFilter {
  nodeId?: string;
  username?: string;
}

export interface NodeHistory {
  rows: HistoryRow[];
  /** Every bucket in the range, oldest first */
  buckets: number[];
  granularity: Granularity;
}

export interface UseNodeHistoryResult {
  data: NodeHistory | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hourly or daily rollups for a range: hourly up to a week, daily beyond, all history for "all".
 *
 * @param enabled - Skip the query, e.g. engine metrics for nodes that don't report engine calls
 */
export function useNodeHistory(
  metric: HistoryMetric,
  range: NodeRange,
  filter: HistoryFilter,
  enabled = true
): UseNodeHistoryResult {
  const { currentNetwork } = useNetwork();
  const { granularity } = NODE_RANGE_CONFIG[range];
  // Bucket starts move once an hour, which keeps the query key stable in between
  const buckets = getBuckets(range, Date.now() / 1000);
  const source = SOURCES[metric];

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'xatu-nodes',
      'history',
      currentNetwork?.name,
      metric,
      range,
      filter.nodeId,
      filter.username,
      buckets[0],
    ],
    queryFn: async ({ signal }) => {
      const table = `${source.table}_${granularity}`;
      const bucketFilter =
        granularity === 'hourly'
          ? { hour_start_date_time_gte: buckets[0] }
          : range === 'all'
            ? { day_start_date_like: '20%' }
            : { day_start_date_in_values: buckets.map(toDateString).join(',') };
      const raw = await fetchAllPages<RawRow>(
        granularity === 'hourly' ? source.hourly : source.daily,
        {
          query: {
            ...bucketFilter,
            ...(filter.nodeId ? { node_id_eq: filter.nodeId } : {}),
            ...(filter.username ? { username_eq: filter.username } : {}),
            page_size: 10000,
          },
        },
        table,
        signal
      );
      const rows = raw.flatMap(row => {
        const start = parseBucket(granularity === 'hourly' ? row.hour_start_date_time : row.day_start_date);
        return start === null ? [] : [{ start, ...source.normalize(row) }];
      });
      const earliest = rows.length > 0 ? Math.min(...rows.map(row => row.start)) : undefined;
      return {
        rows,
        buckets: range === 'all' ? getBuckets(range, Date.now() / 1000, earliest) : buckets,
        granularity,
      };
    },
    enabled: enabled && !!currentNetwork,
    placeholderData: keepPreviousData,
    // Overrides the app's retry-forever default, so a missing table settles to the empty fallback below
    retry: 2,
  });

  // A table the API doesn't serve yet (e.g. a rollup still deploying) reads as no data rather than loading forever
  const fallback = error ? { rows: [], buckets, granularity } : null;
  return { data: data ?? fallback, isLoading: enabled && isLoading && !error, error };
}

/**
 * Rows of one node by bucket start.
 */
export function rowsByBucket(rows: HistoryRow[], nodeId?: string): Map<number, HistoryRow> {
  const byBucket = new Map<number, HistoryRow>();
  rows.forEach(row => {
    if (nodeId === undefined || row.nodeId === nodeId) byBucket.set(row.start, row);
  });
  return byBucket;
}
