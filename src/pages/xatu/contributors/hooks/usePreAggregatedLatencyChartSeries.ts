import { useMemo } from 'react';
import type { SeriesData, EnrichedDataPoint } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';

// Stable color palette for node visualization
const NODE_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'] as const;

/**
 * Generate a unique, readable series name from node_id and implementation
 *
 * Examples:
 * - "pub-user-lighthouse-london-01" + "lighthouse" → "lighthouse - london-01"
 * - "corp-acme-prysm-nyc" + "prysm" → "prysm - nyc"
 * - "random-uuid-string" + "teku" → "teku - uuid-string" (last 12 chars)
 *
 * @param nodeId - The unique node identifier
 * @param implementation - The consensus client implementation name
 * @returns A unique, human-readable series name
 */
function generateSeriesName(nodeId: string, implementation: string): string {
  // Try to extract a meaningful suffix from node_id
  // Split by common delimiters and take the last 2-3 segments
  const parts = nodeId.split(/[-_]/);

  if (parts.length > 2) {
    // Take last 2 segments for multi-part IDs (e.g., "london-01", "nyc-alpha")
    const suffix = parts.slice(-2).join('-');
    return `${implementation} - ${suffix}`;
  } else if (parts.length === 2) {
    // Take last segment for 2-part IDs
    return `${implementation} - ${parts[1]}`;
  } else {
    // Fallback: use last 12 characters of node_id for unstructured IDs
    const shortId = nodeId.slice(-12);
    return `${implementation} - ${shortId}`;
  }
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

    // Organize data by node - data is already aggregated per slot per node
    items.forEach(item => {
      if (item.slot == null || item.median_seen_slot_start_diff == null || !item.node_id) return;

      const nodeId = item.node_id;
      const implementation = item.meta_consensus_implementation || 'unknown';

      // Track consensus implementation for this node
      if (!nodeImplementationMap.has(nodeId)) {
        nodeImplementationMap.set(nodeId, implementation);
      }

      // Add pre-aggregated data point to node series with enriched metadata
      if (!nodeSeriesMap.has(nodeId)) {
        nodeSeriesMap.set(nodeId, []);
      }
      nodeSeriesMap.get(nodeId)!.push({
        value: [item.slot, item.median_seen_slot_start_diff],
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

      seriesData.push({
        name: generateSeriesName(nodeId, implementation),
        data: chartData,
        color: extendedPalette[index % extendedPalette.length],
        showSymbol: true,
        symbolSize: 4,
        lineWidth: 2,
      });
    });

    // Calculate axis range
    const allSlots = seriesData.flatMap(s => (s.data as EnrichedDataPoint[]).map(d => d.value[0]));
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
