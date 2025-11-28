import { useMemo } from 'react';
import type { SeriesData, EnrichedDataPoint } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';

// Stable color palette for node visualization
const NODE_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'] as const;

/**
 * Generate a unique series name from node_id and implementation
 *
 * Uses the full node_id to guarantee uniqueness across all nodes.
 *
 * @param nodeId - The unique node identifier
 * @param implementation - The consensus client implementation name
 * @returns A unique series name
 */
function generateSeriesName(nodeId: string, implementation: string): string {
  // Use full node_id to guarantee uniqueness
  // Format: "implementation - node_id"
  return `${implementation} - ${nodeId}`;
}

/**
 * Pre-aggregated data point from fct_attestation_observation_by_node
 * Data is already aggregated per slot per node (one record per slot per node)
 */
interface PreAggregatedLatencyDataPoint {
  slot?: number | null;
  node_id?: string | null;
  avg_seen_slot_start_diff?: number | null;
  median_seen_slot_start_diff?: number | null;
  min_seen_slot_start_diff?: number | null;
  max_seen_slot_start_diff?: number | null;
  meta_consensus_implementation?: string | null;
  attestation_count?: number | null;
}

/**
 * Result from usePreAggregatedLatencyChartSeries hook
 */
export interface PreAggregatedLatencyChartSeriesResult {
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
 * Hook for processing pre-aggregated latency chart data into series format
 *
 * Used by AttestationLatencyChart which sources from fct_attestation_observation_by_node.
 * This table provides pre-aggregated statistics (avg, median, min, max latency) per slot per node,
 * eliminating the need for client-side aggregation.
 *
 * Uses median latency as the primary metric (more robust to outliers than average).
 * Min/max/avg statistics are included in data points for enhanced tooltip display.
 *
 * @param data - Raw API response data with pre-aggregated statistics
 * @param dataKey - Key to access the data array in the response
 * @returns Processed chart data with series, axis ranges, and observation count
 */
export function usePreAggregatedLatencyChartSeries(
  data: unknown,
  dataKey: string
): PreAggregatedLatencyChartSeriesResult {
  const colors = useThemeColors();

  // Process pre-aggregated data into series format for MultiLineChart
  const { series, minSlot, maxSlot, dataCount } = useMemo(() => {
    const items = ((data as Record<string, unknown>)?.[dataKey] ?? []) as PreAggregatedLatencyDataPoint[];
    const nodeSeriesMap = new Map<string, EnrichedDataPoint[]>();
    const nodeImplementationMap = new Map<string, string>();
    let minSlotValue = Infinity;
    let maxSlotValue = -Infinity;

    // Organize data by node - data is already aggregated per slot per node
    // Track min/max slots during this loop to avoid second iteration
    items.forEach(item => {
      if (item.slot == null || item.median_seen_slot_start_diff == null || !item.node_id) return;

      const nodeId = item.node_id;
      const implementation = item.meta_consensus_implementation || 'unknown';
      const slot = item.slot;

      // Track min/max slots
      if (slot < minSlotValue) minSlotValue = slot;
      if (slot > maxSlotValue) maxSlotValue = slot;

      // Track consensus implementation for this node
      if (!nodeImplementationMap.has(nodeId)) {
        nodeImplementationMap.set(nodeId, implementation);
      }

      // Add pre-aggregated data point to node series with enriched metadata
      if (!nodeSeriesMap.has(nodeId)) {
        nodeSeriesMap.set(nodeId, []);
      }
      nodeSeriesMap.get(nodeId)!.push({
        value: [slot, item.median_seen_slot_start_diff],
        min: item.min_seen_slot_start_diff ?? undefined,
        max: item.max_seen_slot_start_diff ?? undefined,
        avg: item.avg_seen_slot_start_diff ?? undefined,
      });
    });

    // Create stable color mapping based on sorted node IDs
    const allNodeIds = Array.from(nodeSeriesMap.keys()).sort();
    const extendedPalette = [colors.primary, ...NODE_COLORS];

    // Build series array for MultiLineChart
    const seriesData: SeriesData[] = [];

    // Add per-node series (each showing median latency for that node)
    allNodeIds.forEach((nodeId, index) => {
      const chartData = nodeSeriesMap.get(nodeId)!.sort((a, b) => a.value[0] - b.value[0]);
      const implementation = nodeImplementationMap.get(nodeId) || 'unknown';
      const seriesName = generateSeriesName(nodeId, implementation);

      seriesData.push({
        name: seriesName,
        data: chartData,
        color: extendedPalette[index % extendedPalette.length],
        showSymbol: true,
        symbolSize: 2,
        lineWidth: 2,
        emphasis: {
          focus: 'series',
          symbolSize: 6,
        },
      });
    });

    // Calculate axis range from tracked min/max (avoid expensive flatMap + spread)
    const calculatedMinSlot = minSlotValue !== Infinity ? minSlotValue - 1 : 0;
    const calculatedMaxSlot = maxSlotValue !== -Infinity ? maxSlotValue + 1 : 0;

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
