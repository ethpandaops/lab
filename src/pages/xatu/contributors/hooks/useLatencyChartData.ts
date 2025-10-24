import { useMemo } from 'react';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';

// Stable color palette for node visualization
const NODE_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'] as const;

/**
 * Generic data point with slot and latency information
 * Matches the shape of API response items (all fields optional)
 */
interface LatencyDataPoint {
  slot?: number | null;
  seen_slot_start_diff?: number | null;
  node_id?: string | null;
  meta_consensus_implementation?: string | null;
}

/**
 * Result from useLatencyChartSeries hook
 */
export interface LatencyChartSeriesResult {
  /** Processed series data ready for MultiLineChart */
  series: SeriesData[];
  /** Minimum slot for x-axis */
  minSlot: number;
  /** Maximum slot for x-axis */
  maxSlot: number;
  /** Data count (number of observations) */
  dataCount: number;
}

/**
 * Hook for processing latency chart data into series format
 *
 * Consolidates common data processing logic used by all latency charts:
 * - BlockLatencyChart
 * - BlobLatencyChart
 * - HeadLatencyChart
 * - AttestationLatencyChart
 *
 * @param data - Raw API response data
 * @param dataKey - Key to access the data array in the response
 * @returns Processed chart data with series, axis ranges, and observation count
 */
export function useLatencyChartSeries(
  data: unknown,
  dataKey: string
): LatencyChartSeriesResult {
  const colors = useThemeColors();

  // Process data into series format for MultiLineChart
  const { series, minSlot, maxSlot, dataCount } = useMemo(() => {
    const items = ((data as Record<string, unknown>)?.[dataKey] ?? []) as LatencyDataPoint[];
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
    dataCount,
  };
}
