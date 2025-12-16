import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctEngineNewPayloadStatusHourlyServiceList,
  fctEngineNewPayloadStatusDailyServiceList,
  fctEngineNewPayloadBySlotServiceList,
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadDurationChunked50MsServiceList,
  fctEngineGetBlobsStatusHourlyServiceList,
  fctEngineGetBlobsStatusDailyServiceList,
  fctEngineGetBlobsBySlotServiceList,
  fctEngineGetBlobsByElClientServiceList,
  fctEngineGetBlobsDurationChunked50MsServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadStatusHourly,
  FctEngineNewPayloadStatusDaily,
  FctEngineNewPayloadBySlot,
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadDurationChunked50Ms,
  FctEngineGetBlobsStatusHourly,
  FctEngineGetBlobsStatusDaily,
  FctEngineGetBlobsBySlot,
  FctEngineGetBlobsByElClient,
  FctEngineGetBlobsDurationChunked50Ms,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import type { TimeRange } from '../IndexPage.types';

export interface EngineTimingsData {
  // newPayload hourly/daily aggregations
  newPayloadHourly: FctEngineNewPayloadStatusHourly[];
  newPayloadDaily: FctEngineNewPayloadStatusDaily[];

  // newPayload per-slot data
  newPayloadBySlot: FctEngineNewPayloadBySlot[];

  // newPayload per-EL-client aggregations
  newPayloadByElClient: FctEngineNewPayloadByElClient[];

  // newPayload duration histogram
  newPayloadDurationHistogram: FctEngineNewPayloadDurationChunked50Ms[];

  // getBlobs hourly/daily aggregations
  getBlobsHourly: FctEngineGetBlobsStatusHourly[];
  getBlobsDaily: FctEngineGetBlobsStatusDaily[];

  // getBlobs per-slot data
  getBlobsBySlot: FctEngineGetBlobsBySlot[];

  // getBlobs per-EL-client aggregations
  getBlobsByElClient: FctEngineGetBlobsByElClient[];

  // getBlobs duration histogram
  getBlobsDurationHistogram: FctEngineGetBlobsDurationChunked50Ms[];
}

export interface UseEngineTimingsDataOptions {
  timeRange: TimeRange;
  referenceNodesOnly: boolean;
}

export interface UseEngineTimingsDataResult {
  data: EngineTimingsData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Calculate time range timestamps based on the selected range
 */
function getTimeRangeTimestamps(range: TimeRange): { start: number; end: number } {
  const now = Math.floor(Date.now() / 1000);
  const end = now;

  let start: number;
  switch (range) {
    case 'hour':
      start = now - 3600; // 1 hour ago
      break;
    case 'day':
      start = now - 86400; // 24 hours ago
      break;
    case '7days':
      start = now - 604800; // 7 days ago
      break;
    default:
      start = now - 86400;
  }

  return { start, end };
}

/**
 * Generate comma-separated date strings for the last N days (YYYY-MM-DD format)
 */
function getDateRangeValues(days: number): string {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates.join(',');
}

/**
 * Hook to fetch all engine timing data based on time range.
 * Uses fetchAllPages to handle pagination automatically for all endpoints.
 */
export function useEngineTimingsData({
  timeRange,
  referenceNodesOnly,
}: UseEngineTimingsDataOptions): UseEngineTimingsDataResult {
  const { currentNetwork } = useNetwork();

  const { start, end } = useMemo(() => getTimeRangeTimestamps(timeRange), [timeRange]);

  // Determine if we should use hourly or daily data based on time range
  const useHourlyData = timeRange === 'hour' || timeRange === 'day';

  // For daily queries, generate date range values (last 7 days)
  const dailyDateValues = getDateRangeValues(7);

  // Build node_class filter if enabled
  const refNodeFilter = referenceNodesOnly ? { node_class_eq: 'eip7870-block-builder' } : {};

  const queries = useQueries({
    queries: [
      // newPayload hourly data
      {
        queryKey: ['engine-timings', 'newPayload-hourly', start, end, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadStatusHourly>(
            fctEngineNewPayloadStatusHourlyServiceList,
            {
              query: {
                hour_start_date_time_gte: start,
                hour_start_date_time_lte: end,
                order_by: 'hour_start_date_time ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_status_hourly',
            signal
          ),
        enabled: !!currentNetwork && useHourlyData,
      },
      // newPayload daily data
      {
        queryKey: ['engine-timings', 'newPayload-daily', dailyDateValues, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadStatusDaily>(
            fctEngineNewPayloadStatusDailyServiceList,
            {
              query: {
                day_start_date_in_values: dailyDateValues,
                order_by: 'day_start_date DESC',
                page_size: 100,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_status_daily',
            signal
          ),
        enabled: !!currentNetwork && !useHourlyData,
      },
      // newPayload per-slot data
      {
        queryKey: ['engine-timings', 'newPayload-by-slot', start, end, timeRange, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadBySlot>(
            fctEngineNewPayloadBySlotServiceList,
            {
              query: {
                slot_start_date_time_gte: start,
                slot_start_date_time_lte: end,
                order_by: 'slot DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_by_slot',
            signal
          ),
        enabled: !!currentNetwork,
      },
      // newPayload per-EL-client aggregations
      {
        queryKey: ['engine-timings', 'newPayload-by-el-client', start, end, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadByElClient>(
            fctEngineNewPayloadByElClientServiceList,
            {
              query: {
                slot_start_date_time_gte: start,
                slot_start_date_time_lte: end,
                order_by: 'slot_start_date_time DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_by_el_client',
            signal
          ),
        enabled: !!currentNetwork,
      },
      // newPayload duration histogram
      {
        queryKey: ['engine-timings', 'newPayload-duration-histogram', start, end, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadDurationChunked50Ms>(
            fctEngineNewPayloadDurationChunked50MsServiceList,
            {
              query: {
                slot_start_date_time_gte: start,
                slot_start_date_time_lte: end,
                order_by: 'chunk_duration_ms ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_duration_chunked_50ms',
            signal
          ),
        enabled: !!currentNetwork,
      },
      // getBlobs hourly data
      {
        queryKey: ['engine-timings', 'getBlobs-hourly', start, end, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsStatusHourly>(
            fctEngineGetBlobsStatusHourlyServiceList,
            {
              query: {
                hour_start_date_time_gte: start,
                hour_start_date_time_lte: end,
                order_by: 'hour_start_date_time ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_status_hourly',
            signal
          ),
        enabled: !!currentNetwork && useHourlyData,
      },
      // getBlobs daily data
      {
        queryKey: ['engine-timings', 'getBlobs-daily', dailyDateValues, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsStatusDaily>(
            fctEngineGetBlobsStatusDailyServiceList,
            {
              query: {
                day_start_date_in_values: dailyDateValues,
                order_by: 'day_start_date DESC',
                page_size: 100,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_status_daily',
            signal
          ),
        enabled: !!currentNetwork && !useHourlyData,
      },
      // getBlobs per-slot data
      {
        queryKey: ['engine-timings', 'getBlobs-by-slot', start, end, timeRange, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsBySlot>(
            fctEngineGetBlobsBySlotServiceList,
            {
              query: {
                slot_start_date_time_gte: start,
                slot_start_date_time_lte: end,
                order_by: 'slot DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_by_slot',
            signal
          ),
        enabled: !!currentNetwork,
      },
      // getBlobs per-EL-client aggregations
      {
        queryKey: ['engine-timings', 'getBlobs-by-el-client', start, end, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsByElClient>(
            fctEngineGetBlobsByElClientServiceList,
            {
              query: {
                slot_start_date_time_gte: start,
                slot_start_date_time_lte: end,
                order_by: 'slot_start_date_time DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_by_el_client',
            signal
          ),
        enabled: !!currentNetwork,
      },
      // getBlobs duration histogram
      {
        queryKey: ['engine-timings', 'getBlobs-duration-histogram', start, end, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsDurationChunked50Ms>(
            fctEngineGetBlobsDurationChunked50MsServiceList,
            {
              query: {
                slot_start_date_time_gte: start,
                slot_start_date_time_lte: end,
                order_by: 'chunk_duration_ms ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_duration_chunked_50ms',
            signal
          ),
        enabled: !!currentNetwork,
      },
    ],
  });

  // Extract results
  const [
    newPayloadHourlyQuery,
    newPayloadDailyQuery,
    newPayloadBySlotQuery,
    newPayloadByElClientQuery,
    newPayloadDurationHistogramQuery,
    getBlobsHourlyQuery,
    getBlobsDailyQuery,
    getBlobsBySlotQuery,
    getBlobsByElClientQuery,
    getBlobsDurationHistogramQuery,
  ] = queries;

  // Check loading state
  const isLoading = queries.some(q => q.isLoading);

  // Check for errors
  const error = queries.find(q => q.error)?.error as Error | null;

  // Build data object if not loading and no errors
  const data: EngineTimingsData | null =
    !isLoading && !error
      ? {
          newPayloadHourly: newPayloadHourlyQuery.data ?? [],
          newPayloadDaily: newPayloadDailyQuery.data ?? [],
          newPayloadBySlot: newPayloadBySlotQuery.data ?? [],
          newPayloadByElClient: newPayloadByElClientQuery.data ?? [],
          newPayloadDurationHistogram: newPayloadDurationHistogramQuery.data ?? [],
          getBlobsHourly: getBlobsHourlyQuery.data ?? [],
          getBlobsDaily: getBlobsDailyQuery.data ?? [],
          getBlobsBySlot: getBlobsBySlotQuery.data ?? [],
          getBlobsByElClient: getBlobsByElClientQuery.data ?? [],
          getBlobsDurationHistogram: getBlobsDurationHistogramQuery.data ?? [],
        }
      : null;

  return { data, isLoading, error };
}
