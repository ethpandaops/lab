import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { useSlotWindowQuery } from './useSlotWindowQuery';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNetwork } from '@/hooks/useNetwork';

// Stable color palette for node visualization
const NODE_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'] as const;

/**
 * Generic data point with slot and latency information
 */
interface LatencyDataPoint {
  slot: number | null | undefined;
  seen_slot_start_diff: number | null | undefined;
  node_id: string | null | undefined;
  meta_consensus_implementation?: string | null | undefined;
}

/**
 * Configuration for latency chart data processing
 */
export interface LatencyChartConfig {
  /** Page size for API query (default: 1000) */
  pageSize?: number;
  /** Slot window size (default: 20) */
  slotWindow?: number;
}

/**
 * Result from useLatencyChartData hook
 */
export interface LatencyChartDataResult {
  /** Processed series data ready for MultiLineChart */
  series: SeriesData[];
  /** Minimum slot for x-axis */
  minSlot: number;
  /** Maximum slot for x-axis */
  maxSlot: number;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Data count (number of observations) */
  dataCount: number;
}

/**
 * Generic hook for processing latency chart data
 *
 * Consolidates common data processing logic used by all latency charts:
 * - BlockLatencyChart
 * - BlobLatencyChart
 * - HeadLatencyChart
 * - AttestationLatencyChart
 *
 * @param username - Contributor username to filter data
 * @param queryOptionsFn - Function that returns TanStack Query options
 * @param config - Optional configuration for query and processing
 * @returns Processed chart data with series, axis ranges, and states
 */
export function useLatencyChartData<T extends { [key: string]: LatencyDataPoint[] | undefined }>(
  username: string,
  queryOptionsFn: (params: {
    query: {
      username_eq: string;
      slot_start_date_time_gte: string | undefined;
      slot_start_date_time_lte: string | undefined;
      page_size: number;
      order_by: string;
    };
  }) => unknown,
  dataKey: keyof T,
  config: LatencyChartConfig = {}
): LatencyChartDataResult {
  const { pageSize = 1000, slotWindow = 20 } = config;
  const queryRange = useSlotWindowQuery(slotWindow);
  const colors = useThemeColors();
  const { currentNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery({
    ...queryOptionsFn({
      query: {
        username_eq: username,
        slot_start_date_time_gte: queryRange?.slot_start_date_time_gte,
        slot_start_date_time_lte: queryRange?.slot_start_date_time_lte,
        page_size: pageSize,
        order_by: 'slot_start_date_time ASC',
      },
    }),
    enabled: !!queryRange && !!currentNetwork,
    placeholderData: previousData => previousData,
  }) as UseQueryResult<T>;

  // Process data into series format for MultiLineChart
  const { series, minSlot, maxSlot, dataCount } = useMemo(() => {
    const items = (data?.[dataKey] ?? []) as LatencyDataPoint[];
    const nodeSlotMap = new Map<string, Map<number, { sum: number; count: number }>>();
    const nodeImplementationMap = new Map<string, string>();
    const aggregateMap = new Map<number, { sum: number; count: number }>();

    // Aggregate data per node per slot
    items.forEach(item => {
      if (item.slot == null || item.seen_slot_start_diff == null || !item.node_id) return;

      const nodeId = item.node_id;
      const implementation = item.meta_consensus_implementation || 'unknown';

      // Track consensus implementation for this node
      if (!nodeImplementationMap.has(nodeId)) {
        nodeImplementationMap.set(nodeId, implementation);
      }

      // Add to per-node data with per-slot aggregation
      if (!nodeSlotMap.has(nodeId)) {
        nodeSlotMap.set(nodeId, new Map());
      }
      const slotMap = nodeSlotMap.get(nodeId)!;
      const existing = slotMap.get(item.slot) ?? { sum: 0, count: 0 };
      existing.sum += item.seen_slot_start_diff;
      existing.count += 1;
      slotMap.set(item.slot, existing);

      // Add to aggregate data
      const aggExisting = aggregateMap.get(item.slot) ?? { sum: 0, count: 0 };
      aggExisting.sum += item.seen_slot_start_diff;
      aggExisting.count += 1;
      aggregateMap.set(item.slot, aggExisting);
    });

    // Create stable color mapping based on sorted node IDs
    const allNodeIds = Array.from(nodeSlotMap.keys()).sort();
    const extendedPalette = [colors.primary, colors.accent, colors.secondary, ...NODE_COLORS];

    // Build series array for MultiLineChart
    const seriesData: SeriesData[] = [];

    // Add per-node series
    allNodeIds.forEach((nodeId, index) => {
      const slotMap = nodeSlotMap.get(nodeId)!;
      const chartData: Array<[number, number]> = Array.from(slotMap.entries())
        .map(([slot, { sum, count }]) => [slot, sum / count] as [number, number])
        .sort((a, b) => a[0] - b[0]);

      seriesData.push({
        name: nodeImplementationMap.get(nodeId) || nodeId,
        data: chartData,
        color: extendedPalette[index % extendedPalette.length],
        showSymbol: true,
        symbolSize: 4,
        lineWidth: 2,
      });
    });

    // Add aggregate series (average) - always include, component will handle visibility
    const avgData: Array<[number, number]> = Array.from(aggregateMap.entries())
      .map(([slot, { sum, count }]) => [slot, sum / count] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    if (avgData.length > 0) {
      seriesData.push({
        name: 'Average',
        data: avgData,
        color: colors.muted,
        lineStyle: 'dashed',
        lineWidth: 3,
        showSymbol: false,
      });
    }

    // Calculate axis range
    const allSlots = seriesData.flatMap(s => (s.data as Array<[number, number]>).map(d => d[0]));
    const calculatedMinSlot = allSlots.length > 0 ? Math.min(...allSlots) - 1 : 0;
    const calculatedMaxSlot = allSlots.length > 0 ? Math.max(...allSlots) + 1 : 0;

    return {
      series: seriesData,
      minSlot: calculatedMinSlot,
      maxSlot: calculatedMaxSlot,
      dataCount: items.length,
    };
  }, [data, dataKey, colors]);

  return {
    series,
    minSlot,
    maxSlot,
    isLoading: isLoading && !data,
    error: error as Error | null,
    dataCount,
  };
}
