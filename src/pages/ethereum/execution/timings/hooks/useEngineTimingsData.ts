import { useMemo, useRef, useState } from 'react';
import { useQueries, keepPreviousData } from '@tanstack/react-query';
import {
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadByElClientHourlyServiceList,
  fctEngineNewPayloadByElClientDailyServiceList,
  fctEngineNewPayloadDurationChunked50MsServiceList,
  fctEngineNewPayloadDurationChunked50MsHourlyServiceList,
  fctEngineNewPayloadDurationChunked50MsDailyServiceList,
  fctEngineGetBlobsByElClientServiceList,
  fctEngineGetBlobsByElClientHourlyServiceList,
  fctEngineGetBlobsByElClientDailyServiceList,
  fctEngineGetBlobsDurationChunked50MsServiceList,
  fctEngineGetBlobsDurationChunked50MsHourlyServiceList,
  fctEngineGetBlobsDurationChunked50MsDailyServiceList,
  fctEngineNewPayloadWinrateHourlyServiceList,
  fctEngineNewPayloadWinrateDailyServiceList,
  intEngineNewPayloadFastestExecutionByNodeClassServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadByElClientDaily,
  FctEngineNewPayloadDurationChunked50Ms,
  FctEngineGetBlobsByElClient,
  FctEngineGetBlobsByElClientHourly,
  FctEngineGetBlobsByElClientDaily,
  FctEngineGetBlobsDurationChunked50Ms,
  FctEngineNewPayloadWinrateHourly,
  FctEngineNewPayloadWinrateDaily,
  IntEngineNewPayloadFastestExecutionByNodeClass,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { completeBucketEnd } from '@/utils/time';
import { TIME_RANGE_CONFIG, PER_SLOT_CHART_RANGES, HOURLY_CHART_RANGES, type TimeRange } from '../IndexPage.types';

export interface EngineTimingsData {
  // newPayload per-EL-client aggregations (includes per-slot granularity)
  newPayloadByElClient: FctEngineNewPayloadByElClient[];

  // newPayload hourly aggregations with true percentiles (for summary table)
  newPayloadByElClientHourly: FctEngineNewPayloadByElClientHourly[];

  // newPayload daily aggregations with true percentiles (for long time ranges)
  newPayloadByElClientDaily: FctEngineNewPayloadByElClientDaily[];

  // newPayload duration histogram over the range, from the per-slot, hourly or daily chunk table
  newPayloadDurationHistogram: Pick<FctEngineNewPayloadDurationChunked50Ms, 'chunk_duration_ms' | 'valid_count'>[];

  // getBlobs per-EL-client aggregations (includes per-slot granularity)
  getBlobsByElClient: FctEngineGetBlobsByElClient[];

  // getBlobs hourly aggregations with true percentiles (for summary table)
  getBlobsByElClientHourly: FctEngineGetBlobsByElClientHourly[];

  // getBlobs daily aggregations with true percentiles (for long time ranges)
  getBlobsByElClientDaily: FctEngineGetBlobsByElClientDaily[];

  // getBlobs duration histogram over the range, from the per-slot, hourly or daily chunk table
  getBlobsDurationHistogram: Pick<FctEngineGetBlobsDurationChunked50Ms, 'chunk_duration_ms' | 'success_count'>[];

  // newPayload winrate (hourly aggregated)
  winrateHourly: FctEngineNewPayloadWinrateHourly[];

  // newPayload winrate (daily aggregated, for long time ranges)
  winrateDaily: FctEngineNewPayloadWinrateDaily[];

  // newPayload winrate (per-slot, for short time ranges)
  winratePerSlot: IntEngineNewPayloadFastestExecutionByNodeClass[];
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
  /** UTC dates of the range's full days, ending yesterday, for the daily tables */
  days: string;
} {
  const config = TIME_RANGE_CONFIG[range];

  const hourlyEnd = completeBucketEnd('hour');
  const hourlyStart = hourlyEnd - config.seconds;

  const todayStart = completeBucketEnd('day');
  const days = generateDateRange(todayStart - config.seconds, todayStart - 1);

  return { hourlyStart, hourlyEnd, days };
}

/**
 * Generate all YYYY-MM-DD UTC date strings in a timestamp range, joined by commas.
 * The daily winrate table keys on a string date column whose generated filters
 * have no gte/lt variants, so ranges are expressed via day_start_date_in_values.
 */
export function generateDateRange(startTs: number, endTs: number): string {
  const dates: string[] = [];
  const current = new Date(startTs * 1000);
  current.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(endTs * 1000);
  endDate.setUTCHours(23, 59, 59, 999);

  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates.join(',');
}

type HistogramGrain = 'slot' | 'hourly' | 'daily';

/** Which chunk table covers the range: per-slot rows for the shortest ranges, hourly for 24h, daily beyond */
function histogramGrain(range: TimeRange): HistogramGrain {
  if (PER_SLOT_CHART_RANGES.includes(range)) return 'slot';
  return range === '24hours' ? 'hourly' : 'daily';
}

/** Time filter for a chunk table of the grain, covering the range */
function histogramQuery(
  grain: HistogramGrain,
  hourlyStart: number,
  hourlyEnd: number,
  days: string
): Record<string, string | number> {
  if (grain === 'slot') return { slot_start_date_time_gte: hourlyStart, slot_start_date_time_lt: hourlyEnd };
  if (grain === 'hourly') return { hour_start_date_time_gte: hourlyStart, hour_start_date_time_lt: hourlyEnd };
  return { day_start_date_in_values: days };
}

const HISTOGRAM_TABLES = {
  newPayload: {
    slot: [fctEngineNewPayloadDurationChunked50MsServiceList, 'fct_engine_new_payload_duration_chunked_50ms'],
    hourly: [
      fctEngineNewPayloadDurationChunked50MsHourlyServiceList,
      'fct_engine_new_payload_duration_chunked_50ms_hourly',
    ],
    daily: [
      fctEngineNewPayloadDurationChunked50MsDailyServiceList,
      'fct_engine_new_payload_duration_chunked_50ms_daily',
    ],
  },
  getBlobs: {
    slot: [fctEngineGetBlobsDurationChunked50MsServiceList, 'fct_engine_get_blobs_duration_chunked_50ms'],
    hourly: [
      fctEngineGetBlobsDurationChunked50MsHourlyServiceList,
      'fct_engine_get_blobs_duration_chunked_50ms_hourly',
    ],
    daily: [fctEngineGetBlobsDurationChunked50MsDailyServiceList, 'fct_engine_get_blobs_duration_chunked_50ms_daily'],
  },
} as const;

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

  const { hourlyStart, hourlyEnd, days } = useMemo(() => getTimeRangeTimestamps(timeRange), [timeRange]);

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

  // Hourly and per-slot tables are too heavy for long ranges (90d+),
  // which use the daily aggregations instead
  const fetchHourlyData = HOURLY_CHART_RANGES.includes(timeRange);

  const histogram = histogramGrain(timeRange);

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
        placeholderData: keepPreviousData,
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
        enabled: !!currentNetwork && fetchHourlyData,
        placeholderData: keepPreviousData,
      },
      // newPayload duration histogram over the range
      {
        queryKey: [
          'engine-timings',
          'newPayload-duration-histogram',
          histogram,
          hourlyStart,
          hourlyEnd,
          referenceNodesOnly,
        ],
        queryFn: ({ signal }) => {
          const [list, table] = HISTOGRAM_TABLES.newPayload[histogram];
          return fetchAllPages<Pick<FctEngineNewPayloadDurationChunked50Ms, 'chunk_duration_ms' | 'valid_count'>>(
            list,
            {
              query: {
                ...histogramQuery(histogram, hourlyStart, hourlyEnd, days),
                order_by: 'chunk_duration_ms ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            table,
            signal
          );
        },
        enabled: !!currentNetwork,
        placeholderData: keepPreviousData,
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
        placeholderData: keepPreviousData,
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
        enabled: !!currentNetwork && fetchBlobs && fetchHourlyData,
        placeholderData: keepPreviousData,
      },
      // getBlobs duration histogram over the range
      {
        queryKey: [
          'engine-timings',
          'getBlobs-duration-histogram',
          histogram,
          hourlyStart,
          hourlyEnd,
          referenceNodesOnly,
        ],
        queryFn: ({ signal }) => {
          const [list, table] = HISTOGRAM_TABLES.getBlobs[histogram];
          return fetchAllPages<Pick<FctEngineGetBlobsDurationChunked50Ms, 'chunk_duration_ms' | 'success_count'>>(
            list,
            {
              query: {
                ...histogramQuery(histogram, hourlyStart, hourlyEnd, days),
                order_by: 'chunk_duration_ms ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            table,
            signal
          );
        },
        enabled: !!currentNetwork && fetchBlobs,
        placeholderData: keepPreviousData,
      },
      // newPayload winrate (hourly) - which EL client had fastest newPayload per slot
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
        enabled: !!currentNetwork && !fetchPerSlotData && fetchHourlyData,
        placeholderData: keepPreviousData,
      },
      // newPayload winrate (daily) - lightweight aggregation for long ranges (90d+)
      {
        queryKey: ['engine-timings', 'winrate-daily', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadWinrateDaily>(
            fctEngineNewPayloadWinrateDailyServiceList,
            {
              query: {
                day_start_date_in_values: days,
                order_by: 'day_start_date ASC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_winrate_daily',
            signal
          ),
        enabled: !!currentNetwork && !fetchHourlyData,
        placeholderData: keepPreviousData,
      },
      // newPayload winrate (per-slot) - raw fastest client per slot for short ranges
      {
        queryKey: ['engine-timings', 'winrate-per-slot', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<IntEngineNewPayloadFastestExecutionByNodeClass>(
            intEngineNewPayloadFastestExecutionByNodeClassServiceList,
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
        placeholderData: keepPreviousData,
      },
      // newPayload daily aggregations (true percentiles) - replaces the hourly table for long ranges (90d+)
      {
        queryKey: ['engine-timings', 'newPayload-by-el-client-daily', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineNewPayloadByElClientDaily>(
            fctEngineNewPayloadByElClientDailyServiceList,
            {
              query: {
                day_start_date_in_values: days,
                order_by: 'day_start_date DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_new_payload_by_el_client_daily',
            signal
          ),
        enabled: !!currentNetwork && !fetchHourlyData,
        placeholderData: keepPreviousData,
      },
      // getBlobs daily aggregations (true percentiles) - replaces the hourly table for long ranges (90d+)
      {
        queryKey: ['engine-timings', 'getBlobs-by-el-client-daily', hourlyStart, hourlyEnd, referenceNodesOnly],
        queryFn: ({ signal }) =>
          fetchAllPages<FctEngineGetBlobsByElClientDaily>(
            fctEngineGetBlobsByElClientDailyServiceList,
            {
              query: {
                day_start_date_in_values: days,
                order_by: 'day_start_date DESC',
                page_size: 10000,
                ...refNodeFilter,
              },
            },
            'fct_engine_get_blobs_by_el_client_daily',
            signal
          ),
        enabled: !!currentNetwork && fetchBlobs && !fetchHourlyData,
        placeholderData: keepPreviousData,
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
    winrateDailyQuery,
    winratePerSlotQuery,
    newPayloadByElClientDailyQuery,
    getBlobsByElClientDailyQuery,
  ] = queries;

  // Primary queries drive the page's loading/empty state: the newPayload queries
  // for hourly-capable ranges, or the daily tables for long ranges
  const newPayloadQueries = queries.slice(0, 3);
  const primaryQueries = fetchHourlyData ? newPayloadQueries : [winrateDailyQuery, newPayloadByElClientDailyQuery];
  const blobQueries = [...queries.slice(3, 6), getBlobsByElClientDailyQuery];

  // Initial loading = no data has ever been fetched yet
  const hasAnyPrimaryData = primaryQueries.some(q => q.data !== undefined);
  const isLoading = !hasAnyPrimaryData && primaryQueries.some(q => q.isFetching);
  const isLoadingBlobs = blobQueries.some(q => q.isLoading);

  // Check for errors (only core queries - winrate is supplementary and shouldn't break the page)
  const coreQueries = [...primaryQueries, ...blobQueries];
  const error = coreQueries.find(q => q.error)?.error as Error | null;

  // Build data object whenever any query has data (stale data is fine during refetch)
  const freshData: EngineTimingsData | null =
    hasAnyPrimaryData && !error
      ? {
          newPayloadByElClient: newPayloadByElClientQuery.data ?? [],
          newPayloadByElClientHourly: newPayloadByElClientHourlyQuery.data ?? [],
          newPayloadByElClientDaily: newPayloadByElClientDailyQuery.data ?? [],
          newPayloadDurationHistogram: newPayloadDurationHistogramQuery.data ?? [],
          getBlobsByElClient: getBlobsByElClientQuery.data ?? [],
          getBlobsByElClientHourly: getBlobsByElClientHourlyQuery.data ?? [],
          getBlobsByElClientDaily: getBlobsByElClientDailyQuery.data ?? [],
          getBlobsDurationHistogram: getBlobsDurationHistogramQuery.data ?? [],
          winrateHourly: winrateHourlyQuery.data ?? [],
          winrateDaily: winrateDailyQuery.data ?? [],
          winratePerSlot: winratePerSlotQuery.data ?? [],
        }
      : null;

  // Keep the last non-null data in a ref so the UI never flashes back to skeleton
  // on time range changes (query key changes cause brief null data transitions)
  const lastDataRef = useRef<EngineTimingsData | null>(null);
  if (freshData !== null) {
    lastDataRef.current = freshData;
  }

  const data = freshData ?? lastDataRef.current;

  return { data, isLoading, isLoadingBlobs, error };
}
