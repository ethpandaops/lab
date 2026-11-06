import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadBySlotServiceList,
  intBlockResourceGasServiceList,
  fctExecutionGasUsedHourlyServiceList,
  fctExecutionGasUsedDailyServiceList,
  fctEngineNewPayloadByElClientHourlyServiceList,
  fctEngineNewPayloadByElClientDailyServiceList,
  fctEngineNewPayloadGasBucketWindowServiceList,
  fctEngineNewPayloadThroughputHistogramWindowServiceList,
  fctEngineNewPayloadResourceShareWindowServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadBySlot,
  IntBlockResourceGas,
  FctExecutionGasUsedHourly,
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadByElClientDaily,
  FctEngineNewPayloadGasBucketWindow,
  FctEngineNewPayloadThroughputHistogramWindow,
  FctEngineNewPayloadResourceShareWindow,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { currentUtcDate } from '@/utils/time';
import { rollupBlocks, slowestBlocks, type PerformanceRollup, type SlowBlock } from '../utils/performance';

/** Rows of the per-slot timing table read to find the slowest blocks' candidate slots */
const SLOWEST_CANDIDATE_ROWS = 100;

/** Most days the slowest-blocks ranking reads, ending at the range's end; longer ranges rank only their last days */
export const SLOWEST_MAX_DAYS = 7;

/** Rows per hour, or per day (keyed by the day's start in hour_start_date_time) on daily ranges */
export interface HourlyData {
  /** Per-client, per-version newPayload timings per hour over the range */
  perClientHourly: FctEngineNewPayloadByElClientHourly[];
  /** Chain-wide gas used per hour over the range */
  gasUsedHourly: Pick<FctExecutionGasUsedHourly, 'total_gas_used' | 'block_count'>[];
}

export interface BlockData {
  /** Per-slot, per-EL-client newPayload timings */
  perClientBlocks: FctEngineNewPayloadByElClient[];
  /** Per-slot newPayload summary (carries block_number for joins) */
  blocks: FctEngineNewPayloadBySlot[];
  /** Gas split by resource for each block */
  resourceGas: IntBlockResourceGas[];
}

type RefNodeFilter = { node_class_eq?: string };

/** Every block's client timings, summary and resource gas in [start, end) */
async function fetchBlocks(
  start: number,
  end: number,
  refNodeFilter: RefNodeFilter,
  signal: AbortSignal
): Promise<BlockData> {
  const range = { slot_start_date_time_gte: start, slot_start_date_time_lt: end, page_size: 10000, ...refNodeFilter };
  const [perClientBlocks, blocks] = await Promise.all([
    fetchAllPages<FctEngineNewPayloadByElClient>(
      fctEngineNewPayloadByElClientServiceList,
      { query: { ...range, status_eq: 'VALID' } },
      'fct_engine_new_payload_by_el_client',
      signal
    ),
    fetchAllPages<FctEngineNewPayloadBySlot>(
      fctEngineNewPayloadBySlotServiceList,
      { query: range },
      'fct_engine_new_payload_by_slot',
      signal
    ),
  ]);
  const numbers = blocks.map(b => b.block_number ?? 0).filter(n => n > 0);
  const resourceGas = numbers.length
    ? await fetchAllPages<IntBlockResourceGas>(
        intBlockResourceGasServiceList,
        {
          query: {
            block_number_gte: Math.min(...numbers),
            block_number_lte: Math.max(...numbers),
            page_size: 10000,
          },
        },
        'int_block_resource_gas',
        signal
      )
    : [];
  return { perClientBlocks, blocks, resourceGas };
}

/**
 * The slowest blocks of [start, end): the server orders per-slot client timings by duration, then every client's
 * timing, the summary and resource gas are read for those slots. Callers keep the range within SLOWEST_MAX_DAYS,
 * since ordering by duration sorts every row in the range.
 */
async function fetchSlowestBlocks(
  start: number,
  end: number,
  refNodeFilter: RefNodeFilter,
  signal: AbortSignal
): Promise<SlowBlock[]> {
  const range = { slot_start_date_time_gte: start, slot_start_date_time_lt: end, ...refNodeFilter };
  const { data } = await fctEngineNewPayloadByElClientServiceList({
    query: {
      ...range,
      status_eq: 'VALID',
      gas_used_gt: 0,
      order_by: 'median_duration_ms DESC',
      page_size: SLOWEST_CANDIDATE_ROWS,
    },
    signal,
    throwOnError: true,
  });
  const slots = [...new Set((data.fct_engine_new_payload_by_el_client ?? []).map(r => r.slot ?? 0))];
  if (slots.length === 0) return [];

  const query = { ...range, slot_in_values: slots.join(','), page_size: 10000 };
  const [perClientBlocks, blocks] = await Promise.all([
    fetchAllPages<FctEngineNewPayloadByElClient>(
      fctEngineNewPayloadByElClientServiceList,
      { query: { ...query, status_eq: 'VALID' } },
      'fct_engine_new_payload_by_el_client',
      signal
    ),
    fetchAllPages<FctEngineNewPayloadBySlot>(
      fctEngineNewPayloadBySlotServiceList,
      { query },
      'fct_engine_new_payload_by_slot',
      signal
    ),
  ]);
  const numbers = blocks.map(b => b.block_number ?? 0).filter(n => n > 0);
  const resourceGas = numbers.length
    ? await fetchAllPages<IntBlockResourceGas>(
        intBlockResourceGasServiceList,
        { query: { block_number_in_values: [...new Set(numbers)].join(','), page_size: 10000 } },
        'int_block_resource_gas',
        signal
      )
    : [];
  return slowestBlocks(perClientBlocks, blocks, resourceGas);
}

/** A precomputed window of the fct_engine_new_payload_*_window tables */
export interface RollupWindow {
  grain: 'hour' | 'day';
  length: number;
}

/** Where the rollup's resource shares start and end, in unix seconds; they lag the other tables */
export interface ShareWindow {
  start: number;
  end: number;
}

/** A window table's rows for one window and node scope; every window fits one page */
async function fetchWindow<T extends { window_start_date_time?: number; window_end_date_time?: number }>(
  list: Parameters<typeof fetchAllPages<T>>[0],
  table: string,
  window: RollupWindow,
  nodeScope: string,
  signal: AbortSignal
): Promise<T[]> {
  return fetchAllPages<T>(
    list,
    {
      query: {
        window_grain_eq: window.grain,
        window_length_in_values: String(window.length),
        node_scope_eq: nodeScope,
        page_size: 10000,
      },
    },
    table,
    signal
  );
}

/** The window tables' counts and sums for one window, plus the window the resource shares cover */
async function fetchRollup(
  window: RollupWindow,
  nodeScope: string,
  signal: AbortSignal
): Promise<{ rollup: PerformanceRollup; shareWindow: ShareWindow | null }> {
  const [gasBuckets, throughput, shares] = await Promise.all([
    fetchWindow<FctEngineNewPayloadGasBucketWindow>(
      fctEngineNewPayloadGasBucketWindowServiceList,
      'fct_engine_new_payload_gas_bucket_window',
      window,
      nodeScope,
      signal
    ),
    fetchWindow<FctEngineNewPayloadThroughputHistogramWindow>(
      fctEngineNewPayloadThroughputHistogramWindowServiceList,
      'fct_engine_new_payload_throughput_histogram_window',
      window,
      nodeScope,
      signal
    ),
    fetchWindow<FctEngineNewPayloadResourceShareWindow>(
      fctEngineNewPayloadResourceShareWindowServiceList,
      'fct_engine_new_payload_resource_share_window',
      window,
      nodeScope,
      signal
    ),
  ]);
  // Keys that left a window are rewritten with zero blocks
  const counted = <T extends { block_count?: number }>(rows: T[]): T[] => rows.filter(r => (r.block_count ?? 0) > 0);
  const share = counted(shares)[0];
  return {
    rollup: { gasBuckets: counted(gasBuckets), throughput: counted(throughput), shares: counted(shares) },
    shareWindow: share ? { start: share.window_start_date_time ?? 0, end: share.window_end_date_time ?? 0 } : null,
  };
}

/**
 * Fetches everything behind the performance page over [start, end): hourly (or, when `daily`, daily) per-client
 * timings and chain gas, the range's block counts and sums (from `window`, or from every block of a short range
 * without one) and the slowest blocks. The previous range's data stays until the next one loads.
 */
export function usePerformanceData({
  start,
  end,
  daily,
  window,
  referenceNodesOnly,
}: {
  start: number;
  end: number;
  /** Read the daily tables, which hold the whole range from its first day */
  daily: boolean;
  /** The precomputed window matching the range; short ranges have none and read every block */
  window: RollupWindow | null;
  referenceNodesOnly: boolean;
}): {
  hourly: HourlyData | null;
  /** Every block of a short range */
  blocks: BlockData | null;
  rollup: PerformanceRollup | null;
  shareWindow: ShareWindow | null;
  slowBlocks: SlowBlock[] | null;
} {
  const { currentNetwork } = useNetwork();
  const network = currentNetwork?.name;
  const refNodeFilter: RefNodeFilter = referenceNodesOnly ? { node_class_eq: 'eip7870-block-builder' } : {};
  const on = !!currentNetwork;

  const today = currentUtcDate();

  const gasUsedHourly = useQuery({
    queryKey: ['engine-perf', 'gas-used', network, daily, start, end],
    queryFn: ({ signal }): Promise<HourlyData['gasUsedHourly']> =>
      daily
        ? // The table goes back to genesis, so read only the range's days, newest first
          fctExecutionGasUsedDailyServiceList({
            query: {
              day_start_date_ne: today,
              order_by: 'day_start_date DESC',
              page_size: Math.round((end - start) / 86400),
            },
            signal,
            throwOnError: true,
          }).then(({ data }) => data.fct_execution_gas_used_daily ?? [])
        : fetchAllPages<FctExecutionGasUsedHourly>(
            fctExecutionGasUsedHourlyServiceList,
            {
              query: {
                hour_start_date_time_gte: start,
                hour_start_date_time_lt: end,
                order_by: 'hour_start_date_time ASC',
                page_size: 10000,
              },
            },
            'fct_execution_gas_used_hourly',
            signal
          ),
    enabled: on,
    placeholderData: keepPreviousData,
  });

  const perClientHourly = useQuery({
    queryKey: ['engine-perf', 'by-el-client', network, daily, start, end, referenceNodesOnly],
    queryFn: ({ signal }): Promise<FctEngineNewPayloadByElClientHourly[]> =>
      daily
        ? // The daily table starts at the range's first day
          fetchAllPages<FctEngineNewPayloadByElClientDaily>(
            fctEngineNewPayloadByElClientDailyServiceList,
            {
              query: {
                day_start_date_ne: today,
                order_by: 'day_start_date DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_by_el_client_daily',
            signal
          ).then(rows =>
            rows.map(({ day_start_date, ...row }) => ({
              ...row,
              hour_start_date_time: Date.parse(`${day_start_date}T00:00:00Z`) / 1000,
            }))
          )
        : fetchAllPages<FctEngineNewPayloadByElClientHourly>(
            fctEngineNewPayloadByElClientHourlyServiceList,
            {
              query: {
                hour_start_date_time_gte: start,
                hour_start_date_time_lt: end,
                order_by: 'hour_start_date_time DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_by_el_client_hourly',
            signal
          ),
    enabled: on,
    placeholderData: keepPreviousData,
  });

  const blocks = useQuery({
    queryKey: ['engine-perf', 'blocks', network, start, end, referenceNodesOnly],
    queryFn: ({ signal }) => fetchBlocks(start, end, refNodeFilter, signal),
    enabled: on && !window,
    placeholderData: keepPreviousData,
  });

  const rollupWindow = useQuery({
    queryKey: ['engine-perf', 'rollup', network, window?.grain, window?.length, referenceNodesOnly],
    queryFn: ({ signal }) => fetchRollup(window!, referenceNodesOnly ? 'reference' : 'all', signal),
    enabled: on && !!window,
    placeholderData: keepPreviousData,
  });

  const slowestStart = Math.max(start, end - SLOWEST_MAX_DAYS * 86_400);
  const slowBlocks = useQuery({
    queryKey: ['engine-perf', 'slowest-blocks', network, slowestStart, end, referenceNodesOnly],
    queryFn: ({ signal }) => fetchSlowestBlocks(slowestStart, end, refNodeFilter, signal),
    enabled: on,
    placeholderData: keepPreviousData,
  });

  const hourly = useMemo(
    () =>
      perClientHourly.data ? { perClientHourly: perClientHourly.data, gasUsedHourly: gasUsedHourly.data ?? [] } : null,
    [perClientHourly.data, gasUsedHourly.data]
  );

  const blockData = window ? null : (blocks.data ?? null);
  const blockRollup = useMemo(
    () => (blockData ? rollupBlocks(blockData.perClientBlocks, blockData.blocks, blockData.resourceGas) : null),
    [blockData]
  );

  return {
    hourly,
    blocks: blockData,
    rollup: window ? (rollupWindow.data?.rollup ?? null) : blockRollup,
    shareWindow: window ? (rollupWindow.data?.shareWindow ?? null) : null,
    slowBlocks: slowBlocks.data ?? null,
  };
}
