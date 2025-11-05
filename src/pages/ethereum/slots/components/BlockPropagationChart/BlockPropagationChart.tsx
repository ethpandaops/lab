import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import type { ScatterSeries, LineSeries } from '@/components/Charts/ScatterAndLine/ScatterAndLine.types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { BlockPropagationChartProps } from './BlockPropagationChart.types';
import type { TooltipFormatterParams, TooltipFormatterParam } from '@/types/echarts';

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
  const { CONTINENT_COLORS } = getDataVizColors();

  // Process data into scatter and line series
  const { scatterSeries, lineSeries, nodeMetadata } = useMemo(() => {
    if (blockPropagationData.length === 0) {
      return { scatterSeries: [], lineSeries: [], nodeMetadata: new Map() };
    }

    // Sort data by time for proper cumulative calculation
    const sortedData = [...blockPropagationData].sort((a, b) => a.seen_slot_start_diff - b.seen_slot_start_diff);

    // Store metadata for each node index
    const metadata = new Map<number, { nodeId: string; continent: string }>();

    // Group data by continent for scatter series
    const continentGroups = new Map<string, Array<[number, number]>>();
    sortedData.forEach((point, index) => {
      const continent = point.meta_client_geo_continent_code || 'Unknown';
      if (!continentGroups.has(continent)) {
        continentGroups.set(continent, []);
      }
      // X = time in seconds, Y = node index
      continentGroups.get(continent)!.push([point.seen_slot_start_diff / 1000, index]);

      // Store metadata for this node index
      metadata.set(index, {
        nodeId: point.node_id,
        continent,
      });
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

    return { scatterSeries: scatter, lineSeries: line, nodeMetadata: metadata };
  }, [blockPropagationData, themeColors, CONTINENT_COLORS]);

  // Custom tooltip formatter
  const tooltipFormatter = useMemo(
    () => (params: TooltipFormatterParams) => {
      // Handle both single param and array of params
      const paramsArray = Array.isArray(params) ? params : [params];
      if (paramsArray.length === 0) return '';

      // Get timestamp from first param
      const firstParam = paramsArray[0] as TooltipFormatterParam;
      const firstData = firstParam.data as [number, number] | undefined;
      if (!firstData) return '';

      const timestamp = firstData[0].toFixed(3);
      let tooltip = `<strong>Time: ${timestamp}s</strong><br/>`;

      // Add info for each series at this point
      paramsArray.forEach(param => {
        const p = param as TooltipFormatterParam;
        const data = p.data as [number, number] | undefined;
        if (!data) return;

        if (p.componentSubType === 'scatter') {
          const nodeIndex = Math.round(data[1]); // Y-axis is node index
          const metadata = nodeMetadata.get(nodeIndex);

          // Show continent as series label, but include node ID and continent in details
          tooltip += `${p.marker} Node Index: ${nodeIndex}<br/>`;
          if (metadata) {
            tooltip += `&nbsp;&nbsp;&nbsp;&nbsp;Node: ${metadata.nodeId}<br/>`;
            tooltip += `&nbsp;&nbsp;&nbsp;&nbsp;Continent: ${metadata.continent}<br/>`;
          }
        } else {
          tooltip += `${p.marker} Cumulative: ${data[1].toFixed(1)}%<br/>`;
        }
      });

      return tooltip;
    },
    [nodeMetadata]
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
      <PopoutCard title="Block Propagation" anchorId="block-propagation-chart" modalSize="xl">
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
    <PopoutCard title="Block Propagation" anchorId="block-propagation-chart" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <ScatterAndLineChart
          scatterSeries={scatterSeries}
          lineSeries={lineSeries}
          xAxisTitle="Slot Time (s)"
          yAxisTitle="Node Index"
          yAxis2Title="Cumulative %"
          height={inModal ? 384 : 288}
          xMin={0}
          xMax={12}
          yMin={0}
          yAxis2Min={0}
          yAxis2Max={100}
          tooltipFormatter={tooltipFormatter}
          tooltipTrigger="axis"
          showLegend={true}
          legendPosition="bottom"
          syncGroup="slot-time"
        />
      )}
    </PopoutCard>
  );
}
