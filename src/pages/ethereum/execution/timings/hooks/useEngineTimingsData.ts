import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctEngineNewPayloadByElClientServiceList,
  fctEngineNewPayloadDurationChunked50MsServiceList,
  fctEngineGetBlobsByElClientServiceList,
  fctEngineGetBlobsDurationChunked50MsServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadDurationChunked50Ms,
  FctEngineGetBlobsByElClient,
  FctEngineGetBlobsDurationChunked50Ms,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import type { TimeRange } from '../IndexPage.types';

export interface EngineTimingsData {
  // newPayload per-EL-client aggregations (includes per-slot granularity)
  newPayloadByElClient: FctEngineNewPayloadByElClient[];

  // newPayload duration histogram
  newPayloadDurationHistogram: FctEngineNewPayloadDurationChunked50Ms[];

  // getBlobs per-EL-client aggregations (includes per-slot granularity)
  getBlobsByElClient: FctEngineGetBlobsByElClient[];

  // getBlobs duration histogram
  getBlobsDurationHistogram: FctEngineGetBlobsDurationChunked50Ms[];
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
 * Calculate time range timestamps based on the selected range.
 */
function getTimeRangeTimestamps(range: TimeRange): { start: number; end: number } {
  const now = Math.floor(Date.now() / 1000);
  const end = now;

  let start: number;
  switch (range) {
    case '1hour':
      start = now - 3600; // 1 hour ago
      break;
    case '3hours':
      start = now - 10800; // 3 hours ago
      break;
    case '6hours':
      start = now - 21600; // 6 hours ago
      break;
    default:
      start = now - 3600; // Default to 1 hour
  }

  return { start, end };
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

  const { start, end } = useMemo(() => getTimeRangeTimestamps(timeRange), [timeRange]);

  // Track if blobs tab has ever been visited (to keep data cached after switching away)
  const [blobsVisited, setBlobsVisited] = useState(false);
  if (activeTab === 'getBlobs' && !blobsVisited) {
    setBlobsVisited(true);
  }
  const fetchBlobs = blobsVisited || activeTab === 'getBlobs';

  // Build node_class filter if enabled
  const refNodeFilter = referenceNodesOnly ? { node_class_eq: 'eip7870-block-builder' } : {};

  const queries = useQueries({
    queries: [
      // newPayload per-EL-client aggregations (includes per-slot data)
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
      // getBlobs per-EL-client aggregations (includes per-slot data)
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
        enabled: !!currentNetwork && fetchBlobs,
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
        enabled: !!currentNetwork && fetchBlobs,
      },
    ],
  });

  // Extract results
  const [
    newPayloadByElClientQuery,
    newPayloadDurationHistogramQuery,
    getBlobsByElClientQuery,
    getBlobsDurationHistogramQuery,
  ] = queries;

  // Check loading state for newPayload queries (first 2)
  const newPayloadQueries = queries.slice(0, 2);
  const blobQueries = queries.slice(2);

  const isLoading = newPayloadQueries.some(q => q.isLoading);
  const isLoadingBlobs = blobQueries.some(q => q.isLoading);

  // Check for errors
  const error = queries.find(q => q.error)?.error as Error | null;

  // Build data object if newPayload is not loading and no errors
  const data: EngineTimingsData | null =
    !isLoading && !error
      ? {
          newPayloadByElClient: newPayloadByElClientQuery.data ?? [],
          newPayloadDurationHistogram: newPayloadDurationHistogramQuery.data ?? [],
          getBlobsByElClient: getBlobsByElClientQuery.data ?? [],
          getBlobsDurationHistogram: getBlobsDurationHistogramQuery.data ?? [],
        }
      : null;

  return { data, isLoading, isLoadingBlobs, error };
}
