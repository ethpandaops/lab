import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadByElClientHourlyServiceList,
  fctEngineNewPayloadDurationChunked50MsServiceList,
  fctEngineGetBlobsByElClientServiceList,
  fctEngineGetBlobsByElClientHourlyServiceList,
  fctEngineGetBlobsDurationChunked50MsServiceList,
  fctEngineNewPayloadWinrateHourlyServiceList,
  intEngineNewPayloadFastestServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadDurationChunked50Ms,
  FctEngineGetBlobsByElClient,
  FctEngineGetBlobsByElClientHourly,
  FctEngineGetBlobsDurationChunked50Ms,
  FctEngineNewPayloadWinrateHourly,
  IntEngineNewPayloadFastest,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { TIME_RANGE_CONFIG, PER_SLOT_CHART_RANGES, type TimeRange } from '../IndexPage.types';

export interface EngineTimingsData {
  // newPayload per-EL-client aggregations (includes per-slot granularity)
  newPayloadByElClient: FctEngineNewPayloadByElClient[];

  // newPayload hourly aggregations with true percentiles (for summary table)
  newPayloadByElClientHourly: FctEngineNewPayloadByElClientHourly[];

  // newPayload duration histogram
  newPayloadDurationHistogram: FctEngineNewPayloadDurationChunked50Ms[];

  // getBlobs per-EL-client aggregations (includes per-slot granularity)
  getBlobsByElClient: FctEngineGetBlobsByElClient[];

  // getBlobs hourly aggregations with true percentiles (for summary table)
  getBlobsByElClientHourly: FctEngineGetBlobsByElClientHourly[];

  // getBlobs duration histogram
  getBlobsDurationHistogram: FctEngineGetBlobsDurationChunked50Ms[];

  // newPayload winrate (hourly aggregated)
  winrateHourly: FctEngineNewPayloadWinrateHourly[];

  // newPayload winrate (per-slot, for short time ranges)
  winratePerSlot: IntEngineNewPayloadFastest[];
}

export type ActiveTab = 'newPayload' | 'getBlobs';

export interface UseEngineTimingsDataOptions {
  timeRange: TimeRange;
  referenceNodesOnly: boolean;
  /** Which tab is currently active - data is fetched lazily based on this */
  activeTab: ActiveTab;
}

export interface UseEngineTimingsDataResult {
  data: EngineTimingsData | null;
  isLoading: boolean;
  isLoadingBlobs: boolean;
  error: Error | null;
}

/**
 * Calculate hour-aligned time range timestamps based on the selected range.
 * All queries use hour-aligned timestamps for consistency across the page.
 * Uses floor(now) to always show the last complete hour(s), avoiding sparse partial-hour data.
 * e.g., "Last 1h" at 08:57 → the 07:00 bucket (complete), not the 08:00 bucket (partial)
 */
function getTimeRangeTimestamps(range: TimeRange): {
  hourlyStart: number;
  hourlyEnd: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const config = TIME_RANGE_CONFIG[range];

  const hourlyEnd = Math.floor(now / 3600) * 3600;
  const hourlyStart = hourlyEnd - config.seconds;

  return { hourlyStart, hourlyEnd };
}

/**
 * Hook to fetch all engine timing data based on time range.
 * Uses fetchAllPages to handle pagination automatically for all endpoints.
 */
export function useEngineTimingsData({
  timeRange,
  referenceNodesOnly,
  activeTab,
}: UseEngineTimingsDataOptions): UseEngineTimingsDataResult {
  const { currentNetwork } = useNetwork();

  const { hourlyStart, hourlyEnd } = useMemo(() => getTimeRangeTimestamps(timeRange), [timeRange]);

  // Track if blobs tab has ever been visited (to keep data cached after switching away)
  const [blobsVisited, setBlobsVisited] = useState(false);
  if (activeTab === 'getBlobs' && !blobsVisited) {
    setBlobsVisited(true);
  }
  const fetchBlobs = blobsVisited || activeTab === 'getBlobs';

  // Build node_class filter if enabled
  const refNodeFilter = referenceNodesOnly ? { node_class_eq: 'eip7870-block-builder' } : {};

  // Only fetch per-slot data for short time ranges (per-slot charts not shown for 24h, 7d)
  const fetchPerSlotData = PER_SLOT_CHART_RANGES.includes(timeRange);

  const queries = useQueries({
    queries: [
      // newPayload per-EL-client aggregations (includes per-slot data)
      // Only fetched for short time ranges to keep queries performant
      // Use hour-aligned timestamps to match hourly data
      {
        queryKey: ['engine-timings', 'newPayload-by-el-client', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadByElClient>(
            fctEngineNewPayloadByElClientServiceList,
            {
              query: {
                slot_start_date_time_gte: hourlyStart,
                slot_start_date_time_lt: hourlyEnd,
                order_by: 'slot_start_date_time DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_by_el_client',
            signal
          ),
        enabled: !!currentNetwork && fetchPerSlotData,
      },
      // newPayload hourly aggregations (true percentiles for summary table)
      // Use hour-aligned timestamps to include all overlapping hour buckets
      {
        queryKey: ['engine-timings', 'newPayload-by-el-client-hourly', hourlyStart, hourlyEnd, referenceNodesOnly],
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
        enabled: !!currentNetwork,
      },
      // newPayload duration histogram
      // Only fetched for short time ranges (histogram based on per-slot data)
      // Use hour-aligned timestamps to match hourly data
      {
        queryKey: ['engine-timings', 'newPayload-duration-histogram', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadDurationChunked50Ms>(
            fctEngineNewPayloadDurationChunked50MsServiceList,
            {
              query: {
                slot_start_date_time_gte: hourlyStart,
                slot_start_date_time_lt: hourlyEnd,
                order_by: 'chunk_duration_ms ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_duration_chunked_50ms',
            signal
          ),
        enabled: !!currentNetwork && fetchPerSlotData,
      },
      // getBlobs per-EL-client aggregations (includes per-slot data)
      // Only fetched for short time ranges to keep queries performant
      // Use hour-aligned timestamps to match hourly data
      {
        queryKey: ['engine-timings', 'getBlobs-by-el-client', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsByElClient>(
            fctEngineGetBlobsByElClientServiceList,
            {
              query: {
                slot_start_date_time_gte: hourlyStart,
                slot_start_date_time_lt: hourlyEnd,
                order_by: 'slot_start_date_time DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_by_el_client',
            signal
          ),
        enabled: !!currentNetwork && fetchBlobs && fetchPerSlotData,
      },
      // getBlobs hourly aggregations (true percentiles for summary table)
      // Use hour-aligned timestamps to include all overlapping hour buckets
      {
        queryKey: ['engine-timings', 'getBlobs-by-el-client-hourly', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsByElClientHourly>(
            fctEngineGetBlobsByElClientHourlyServiceList,
            {
              query: {
                hour_start_date_time_gte: hourlyStart,
                hour_start_date_time_lt: hourlyEnd,
                order_by: 'hour_start_date_time DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_by_el_client_hourly',
            signal
          ),
        enabled: !!currentNetwork && fetchBlobs,
      },
      // getBlobs duration histogram
      // Only fetched for short time ranges (histogram based on per-slot data)
      // Use hour-aligned timestamps to match hourly data
      {
        queryKey: ['engine-timings', 'getBlobs-duration-histogram', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsDurationChunked50Ms>(
            fctEngineGetBlobsDurationChunked50MsServiceList,
            {
              query: {
                slot_start_date_time_gte: hourlyStart,
                slot_start_date_time_lt: hourlyEnd,
                order_by: 'chunk_duration_ms ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_duration_chunked_50ms',
            signal
          ),
        enabled: !!currentNetwork && fetchBlobs && fetchPerSlotData,
      },
      // newPayload winrate (hourly) - which EL client had fastest newPayload per slot
      // Must apply refNodeFilter to avoid double-counting across node_classes
      {
        queryKey: ['engine-timings', 'winrate-hourly', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadWinrateHourly>(
            fctEngineNewPayloadWinrateHourlyServiceList,
            {
              query: {
                hour_start_date_time_gte: hourlyStart,
                hour_start_date_time_lt: hourlyEnd,
                order_by: 'hour_start_date_time ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_winrate_hourly',
            signal
          ),
        enabled: !!currentNetwork && !fetchPerSlotData,
      },
      // newPayload winrate (per-slot) - raw fastest client per slot for short ranges
      {
        queryKey: ['engine-timings', 'winrate-per-slot', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<IntEngineNewPayloadFastest>(
            intEngineNewPayloadFastestServiceList,
            {
              query: {
                slot_start_date_time_gte: hourlyStart,
                slot_start_date_time_lt: hourlyEnd,
                order_by: 'slot_start_date_time ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'int_engine_new_payload_fastest_execution_by_node_class',
            signal
          ),
        enabled: !!currentNetwork && fetchPerSlotData,
      },
    ],
  });

  // Extract results
  const [
    newPayloadByElClientQuery,
    newPayloadByElClientHourlyQuery,
    newPayloadDurationHistogramQuery,
    getBlobsByElClientQuery,
    getBlobsByElClientHourlyQuery,
    getBlobsDurationHistogramQuery,
    winrateHourlyQuery,
    winratePerSlotQuery,
  ] = queries;

  // Check loading state for newPayload queries (first 3)
  const newPayloadQueries = queries.slice(0, 3);
  const blobQueries = queries.slice(3, 6);

  const isLoading = newPayloadQueries.some(q => q.isLoading);
  const isLoadingBlobs = blobQueries.some(q => q.isLoading);

  // Check for errors (only core queries - winrate is supplementary and shouldn't break the page)
  const coreQueries = [...newPayloadQueries, ...blobQueries];
  const error = coreQueries.find(q => q.error)?.error as Error | null;

  // Build data object if newPayload is not loading and no errors
  const data: EngineTimingsData | null =
    !isLoading && !error
      ? {
          newPayloadByElClient: newPayloadByElClientQuery.data ?? [],
          newPayloadByElClientHourly: newPayloadByElClientHourlyQuery.data ?? [],
          newPayloadDurationHistogram: newPayloadDurationHistogramQuery.data ?? [],
          getBlobsByElClient: getBlobsByElClientQuery.data ?? [],
          getBlobsByElClientHourly: getBlobsByElClientHourlyQuery.data ?? [],
          getBlobsDurationHistogram: getBlobsDurationHistogramQuery.data ?? [],
          winrateHourly: winrateHourlyQuery.data ?? [],
          winratePerSlot: winratePerSlotQuery.data ?? [],
        }
      : null;

  return { data, isLoading, isLoadingBlobs, error };
}
