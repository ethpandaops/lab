import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import type { ScatterSeries, LineSeries } from '@/components/Charts/ScatterAndLine/ScatterAndLine.types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CONTINENT_COLORS } from '@/theme/data-visualization-colors';
import type { BlockPropagationChartProps } from './BlockPropagationChart.types';

/**
 * BlockPropagationChart - Visualizes block propagation across the network
 *
 * Shows when nodes first saw the block using a scatter plot (colored by continent)
 * with a cumulative distribution line showing percentage of nodes over time.
 *
 * @example
 * ```tsx
 * <BlockPropagationChart
 *   blockPropagationData={[
 *     { seen_slot_start_diff: 145, node_id: 'node1', meta_client_geo_continent_code: 'EU' },
 *     { seen_slot_start_diff: 230, node_id: 'node2', meta_client_geo_continent_code: 'NA' },
 *     ...
 *   ]}
 * />
 * ```
 */
export function BlockPropagationChart({ blockPropagationData }: BlockPropagationChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process data into scatter and line series
  const { scatterSeries, lineSeries } = useMemo(() => {
    if (blockPropagationData.length === 0) {
      return { scatterSeries: [], lineSeries: [] };
    }

    // Sort data by time for proper cumulative calculation
    const sortedData = [...blockPropagationData].sort((a, b) => a.seen_slot_start_diff - b.seen_slot_start_diff);

    // Group data by continent for scatter series
    const continentGroups = new Map<string, Array<[number, number]>>();
    sortedData.forEach((point, index) => {
      const continent = point.meta_client_geo_continent_code || 'Unknown';
      if (!continentGroups.has(continent)) {
        continentGroups.set(continent, []);
      }
      // X = time in seconds, Y = node index (with slight jitter for visibility)
      const jitter = (Math.random() - 0.5) * 0.4; // ±0.2 jitter
      continentGroups.get(continent)!.push([point.seen_slot_start_diff / 1000, index + jitter]);
    });

    // Calculate cumulative distribution for line chart
    const totalNodes = sortedData.length;
    const cumulativeData: Array<[number, number]> = [];
    sortedData.forEach((point, index) => {
      const percentage = ((index + 1) / totalNodes) * 100;
      cumulativeData.push([point.seen_slot_start_diff / 1000, percentage]);
    });

    // Create scatter series for each continent
    const scatter: ScatterSeries[] = Array.from(continentGroups.entries()).map(([continent, data]) => ({
      name: continent,
      data,
      color: CONTINENT_COLORS[continent as keyof typeof CONTINENT_COLORS] || themeColors.muted,
      symbolSize: 6,
      yAxisIndex: 0,
    }));

    // Create cumulative line series
    const line: LineSeries[] = [
      {
        name: 'Cumulative %',
        data: cumulativeData,
        color: themeColors.primary,
        smooth: true,
        lineWidth: 3,
        yAxisIndex: 1,
      },
    ];

    return { scatterSeries: scatter, lineSeries: line };
  }, [blockPropagationData, themeColors]);

  // Custom tooltip formatter
  const tooltipFormatter = useMemo(
    () => (params: { componentSubType: string; seriesName: string; data: [number, number] }) => {
      if (params.componentSubType === 'scatter') {
        return `${params.seriesName}<br/>Time: ${params.data[0].toFixed(3)}s`;
      } else {
        return `Cumulative: ${params.data[1].toFixed(1)}%<br/>Time: ${params.data[0].toFixed(3)}s`;
      }
    },
    []
  );

  // Calculate average propagation time for header
  const avgPropagationTime = useMemo(() => {
    if (blockPropagationData.length === 0) return 0;
    const total = blockPropagationData.reduce((sum, point) => sum + point.seen_slot_start_diff, 0);
    return total / blockPropagationData.length;
  }, [blockPropagationData]);

  // Handle empty data
  if (blockPropagationData.length === 0) {
    return (
      <PopoutCard title="Block Propagation" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-72 items-center justify-center text-muted'
            }
          >
            <p>No block propagation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `Avg: ${avgPropagationTime.toFixed(0)}ms across ${blockPropagationData.length.toLocaleString()} nodes`;

  return (
    <PopoutCard title="Block Propagation" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <ScatterAndLineChart
          scatterSeries={scatterSeries}
          lineSeries={lineSeries}
          xAxisTitle="Time from Slot Start (s)"
          yAxisTitle="Node Index"
          yAxis2Title="Cumulative %"
          height={inModal ? 384 : 288}
          xMin={0}
          xMax={12}
          yAxis2Min={0}
          yAxis2Max={100}
          tooltipFormatter={tooltipFormatter}
          showLegend={true}
          legendPosition="bottom"
          notMerge={false}
          lazyUpdate={true}
        />
      )}
    </PopoutCard>
  );
}
