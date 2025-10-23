import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card } from '@/components/Layout/Card';
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

  // Process data and create chart options
  const chartOption = useMemo((): EChartsOption => {
    if (blockPropagationData.length === 0) {
      return {};
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
    const scatterSeries = Array.from(continentGroups.entries()).map(([continent, data]) => ({
      name: continent,
      type: 'scatter' as const,
      data,
      symbolSize: 6,
      itemStyle: {
        color: CONTINENT_COLORS[continent as keyof typeof CONTINENT_COLORS] || themeColors.muted,
        opacity: 0.7,
      },
      yAxisIndex: 0,
    }));

    // Create cumulative line series
    const lineSeries = {
      name: 'Cumulative %',
      type: 'line' as const,
      data: cumulativeData,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: themeColors.primary,
        width: 3,
      },
      yAxisIndex: 1,
    };

    return {
      animation: false,
      grid: {
        top: 40,
        right: 80,
        bottom: 80,
        left: 80,
        containLabel: true,
      },
      xAxis: {
        type: 'value' as const,
        name: 'Time from Slot Start (s)',
        nameLocation: 'middle' as const,
        nameGap: 30,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        min: 0,
        max: 12,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: '{value}s',
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: themeColors.border,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Node Index',
          nameLocation: 'middle' as const,
          nameGap: 50,
          nameTextStyle: {
            color: themeColors.muted,
            fontSize: 11,
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: themeColors.muted,
            fontSize: 10,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: themeColors.border,
              type: 'dashed' as const,
              opacity: 0.2,
            },
          },
        },
        {
          type: 'value' as const,
          name: 'Cumulative %',
          nameLocation: 'middle' as const,
          nameGap: 50,
          nameTextStyle: {
            color: themeColors.muted,
            fontSize: 11,
          },
          min: 0,
          max: 100,
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: themeColors.muted,
            fontSize: 10,
            formatter: '{value}%',
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [...scatterSeries, lineSeries],
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { componentSubType: string; seriesName: string; data: [number, number] }) => {
          if (params.componentSubType === 'scatter') {
            return `${params.seriesName}<br/>Time: ${params.data[0].toFixed(3)}s`;
          } else {
            return `Cumulative: ${params.data[1].toFixed(1)}%<br/>Time: ${params.data[0].toFixed(3)}s`;
          }
        },
      },
      legend: {
        show: true,
        orient: 'horizontal' as const,
        bottom: 8,
        left: 'center' as const,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 10,
        },
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 16,
      },
    } as unknown as EChartsOption;
  }, [blockPropagationData, themeColors]);

  // Calculate average propagation time for header
  const avgPropagationTime = useMemo(() => {
    if (blockPropagationData.length === 0) return 0;
    const total = blockPropagationData.reduce((sum, point) => sum + point.seen_slot_start_diff, 0);
    return total / blockPropagationData.length;
  }, [blockPropagationData]);

  // Handle empty data
  if (blockPropagationData.length === 0) {
    return (
      <Card header={<h3 className="text-lg/7 font-semibold text-foreground">Block Propagation</h3>}>
        <div className="flex h-72 items-center justify-center text-muted">
          <p>No block propagation data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Block Propagation"
      description={`Avg: ${avgPropagationTime.toFixed(0)}ms across ${blockPropagationData.length.toLocaleString()} nodes`}
    >
      <div className="h-72">
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </Card>
  );
}
