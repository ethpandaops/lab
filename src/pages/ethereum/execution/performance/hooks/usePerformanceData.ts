import { useMemo, useState } from 'react';
import { useQueries, useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadBySlotServiceList,
  intBlockResourceGasServiceList,
  fctExecutionGasUsedHourlyServiceList,
  fctExecutionGasUsedDailyServiceList,
  fctEngineNewPayloadByElClientHourlyServiceList,
  fctEngineNewPayloadByElClientDailyServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadBySlot,
  IntBlockResourceGas,
  FctExecutionGasUsedHourly,
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadByElClientDaily,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { currentUtcDate } from '@/utils/time';
import { blockSlices, buildClientPerformance, type SlowBlock } from '../utils/performance';

/** Rows of the per-slot timing table read to find the slowest blocks' candidate slots */
const SLOWEST_CANDIDATE_ROWS = 100;

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
 * The slowest blocks across the whole range: the server orders per-slot client timings by
 * duration, then every client's timing, the summary and resource gas are read for those slots.
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
  return buildClientPerformance(perClientBlocks, blocks, resourceGas).slowBlocks;
}

/** All slices joined once every one has loaded; module-level so useQueries can memoize it */
function combineSlices(results: { data?: BlockData }[]): BlockData | null {
  if (!results.every(r => r.data)) return null;
  return {
    perClientBlocks: results.flatMap(r => r.data!.perClientBlocks),
    blocks: results.flatMap(r => r.data!.blocks),
    resourceGas: results.flatMap(r => r.data!.resourceGas),
  };
}

/**
 * Fetches everything behind the performance page over [start, end): hourly (or, when `daily`, daily) per-client
 * timings and chain gas, block-level data (every block, or evenly spread slices on long ranges) and the
 * slowest blocks of the whole range. The previous range's data stays until the next one loads.
 */
export function usePerformanceData({
  start,
  end,
  daily,
  referenceNodesOnly,
}: {
  start: number;
  end: number;
  /** Read the daily tables, which hold the whole range from its first day */
  daily: boolean;
  referenceNodesOnly: boolean;
}): { hourly: HourlyData | null; blocks: BlockData | null; slowBlocks: SlowBlock[] | null } {
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

  const blocks = useQueries({
    queries: blockSlices(start, end).map(([s, e]) => ({
      queryKey: ['engine-perf', 'blocks', network, s, e, referenceNodesOnly],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchBlocks(s, e, refNodeFilter, signal),
      enabled: on,
    })),
    combine: combineSlices,
  });
  // The slices' keys change with the range, so hold the last complete set while the next one loads
  const [shownBlocks, setShownBlocks] = useState<BlockData | null>(null);
  if (blocks && blocks !== shownBlocks) setShownBlocks(blocks);

  const slowBlocks = useQuery({
    queryKey: ['engine-perf', 'slowest-blocks', network, start, end, referenceNodesOnly],
    queryFn: ({ signal }) => fetchSlowestBlocks(start, end, refNodeFilter, signal),
    enabled: on,
    placeholderData: keepPreviousData,
  });

  const hourly = useMemo(
    () =>
      perClientHourly.data ? { perClientHourly: perClientHourly.data, gasUsedHourly: gasUsedHourly.data ?? [] } : null,
    [perClientHourly.data, gasUsedHourly.data]
  );

  return {
    hourly,
    blocks: blocks ?? shownBlocks,
    slowBlocks: slowBlocks.data ?? null,
  };
}
