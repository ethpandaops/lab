import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadBySlotServiceList,
  intBlockResourceGasServiceList,
  fctExecutionGasUsedHourlyServiceList,
  fctEngineNewPayloadByElClientHourlyServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadBySlot,
  IntBlockResourceGas,
  FctExecutionGasUsedHourly,
  FctEngineNewPayloadByElClientHourly,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { TIME_RANGE_CONFIG, type TimeRange } from '../IndexPage.types';

/** Block-level analysis covers at most this many seconds, so it stays fast at any range */
export const BLOCK_WINDOW_MAX_SECONDS = 6 * 3600;

export interface PerformanceData {
  /** Per-slot, per-EL-client newPayload timings over the block window */
  perClientBlocks: FctEngineNewPayloadByElClient[];
  /** Per-slot newPayload summary (carries block_number for joins) over the block window */
  blocks: FctEngineNewPayloadBySlot[];
  /** Gas split by resource for each block in the block window */
  resourceGas: IntBlockResourceGas[];
  /** Per-client, per-version newPayload timings per hour over the selected range */
  perClientHourly: FctEngineNewPayloadByElClientHourly[];
  /** Chain-wide gas used per hour over the selected range */
  gasUsedHourly: FctExecutionGasUsedHourly[];
  /** Length of the block window in seconds */
  blockWindowSeconds: number;
}

/**
 * Fetches everything behind the performance page: hourly per-client timings over the range,
 * per-block client timings joined with per-block resource gas, and chain-wide gas used.
 */
export function usePerformanceData({
  timeRange,
  referenceNodesOnly,
  enabled,
}: {
  timeRange: TimeRange;
  referenceNodesOnly: boolean;
  enabled: boolean;
}): { data: PerformanceData | null; isLoading: boolean } {
  const { currentNetwork } = useNetwork();
  const refNodeFilter = referenceNodesOnly ? { node_class_eq: 'eip7870-block-builder' } : {};

  const { hourlyStart, hourlyEnd, blockStart } = useMemo(() => {
    const end = Math.floor(Date.now() / 1000 / 3600) * 3600;
    const seconds = TIME_RANGE_CONFIG[timeRange].seconds;
    return {
      hourlyStart: end - seconds,
      hourlyEnd: end,
      blockStart: end - Math.min(seconds, BLOCK_WINDOW_MAX_SECONDS),
    };
  }, [timeRange]);

  const on = !!currentNetwork && enabled;

  const perClientBlocks = useQuery({
    queryKey: ['engine-perf', 'by-el-client', blockStart, hourlyEnd, referenceNodesOnly],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadByElClient>(
        fctEngineNewPayloadByElClientServiceList,
        {
          query: {
            slot_start_date_time_gte: blockStart,
            slot_start_date_time_lt: hourlyEnd,
            status_eq: 'VALID',
            page_size: 10000,
            ...refNodeFilter,
          },
        },
        'fct_engine_new_payload_by_el_client',
        signal
      ),
    enabled: on,
    placeholderData: keepPreviousData,
  });

  const blocks = useQuery({
    queryKey: ['engine-perf', 'by-slot', blockStart, hourlyEnd, referenceNodesOnly],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadBySlot>(
        fctEngineNewPayloadBySlotServiceList,
        {
          query: {
            slot_start_date_time_gte: blockStart,
            slot_start_date_time_lt: hourlyEnd,
            page_size: 10000,
            ...refNodeFilter,
          },
        },
        'fct_engine_new_payload_by_slot',
        signal
      ),
    enabled: on,
    placeholderData: keepPreviousData,
  });

  const blockNumbers = (blocks.data ?? []).map(b => b.block_number ?? 0).filter(n => n > 0);
  const minBlock = blockNumbers.length ? Math.min(...blockNumbers) : 0;
  const maxBlock = blockNumbers.length ? Math.max(...blockNumbers) : 0;

  const resourceGas = useQuery({
    queryKey: ['engine-perf', 'resource-gas', minBlock, maxBlock],
    queryFn: ({ signal }) =>
      fetchAllPages<IntBlockResourceGas>(
        intBlockResourceGasServiceList,
        { query: { block_number_gte: minBlock, block_number_lte: maxBlock, page_size: 10000 } },
        'int_block_resource_gas',
        signal
      ),
    enabled: on && maxBlock > 0,
    placeholderData: keepPreviousData,
  });

  const gasUsedHourly = useQuery({
    queryKey: ['engine-perf', 'gas-used-hourly', hourlyStart, hourlyEnd],
    queryFn: ({ signal }) =>
      fetchAllPages<FctExecutionGasUsedHourly>(
        fctExecutionGasUsedHourlyServiceList,
        {
          query: {
            hour_start_date_time_gte: hourlyStart,
            hour_start_date_time_lt: hourlyEnd,
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
    queryKey: ['engine-perf', 'by-el-client-hourly', hourlyStart, hourlyEnd, referenceNodesOnly],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadByElClientHourly>(
        fctEngineNewPayloadByElClientHourlyServiceList,
        {
          query: {
            hour_start_date_time_gte: hourlyStart,
            hour_start_date_time_lt: hourlyEnd,
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

  const isLoading = !perClientBlocks.data || !blocks.data || !perClientHourly.data;

  return {
    data: isLoading
      ? null
      : {
          perClientBlocks: perClientBlocks.data ?? [],
          blocks: blocks.data ?? [],
          resourceGas: resourceGas.data ?? [],
          gasUsedHourly: gasUsedHourly.data ?? [],
          perClientHourly: perClientHourly.data ?? [],
          blockWindowSeconds: hourlyEnd - blockStart,
        },
    isLoading,
  };
}
