import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BLOB_COLORS } from '@/theme/data-visualization-colors';
import type { BlobPropagationChartProps } from './BlobPropagationChart.types';

/**
 * BlobPropagationChart - Visualizes blob propagation timing across the network
 *
 * Shows blob propagation using a multi-series scatter plot where each blob index
 * is a separate series with distinct colors. Y-axis shows blob index with jitter
 * to display multiple nodes at same time/blob.
 *
 * @example
 * ```tsx
 * <BlobPropagationChart
 *   blobPropagationData={[
 *     { blob_index: 0, seen_slot_start_diff: 850, node_id: 'node1', meta_client_geo_continent_code: 'EU' },
 *     { blob_index: 1, seen_slot_start_diff: 920, node_id: 'node2', meta_client_geo_continent_code: 'NA' },
 *     ...
 *   ]}
 * />
 * ```
 */
export function BlobPropagationChart({ blobPropagationData }: BlobPropagationChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process data and create chart options
  const chartOption = useMemo((): EChartsOption => {
    if (blobPropagationData.length === 0) {
      return {};
    }

    // Group data by blob index for separate scatter series
    const blobGroups = new Map<number, Array<[number, number, string]>>();
    blobPropagationData.forEach(point => {
      const blobIndex = point.blob_index;
      if (!blobGroups.has(blobIndex)) {
        blobGroups.set(blobIndex, []);
      }
      // X = time in seconds, Y = blob index with jitter, value[2] = continent for tooltip
      const jitter = (Math.random() - 0.5) * 0.3; // ±0.15 jitter
      blobGroups
        .get(blobIndex)!
        .push([
          point.seen_slot_start_diff / 1000,
          blobIndex + jitter,
          point.meta_client_geo_continent_code || 'Unknown',
        ]);
    });

    // Get unique blob indices and sort them
    const blobIndices = Array.from(blobGroups.keys()).sort((a, b) => a - b);

    // Create scatter series for each blob index
    const scatterSeries = blobIndices.map(blobIndex => ({
      name: `Blob ${blobIndex}`,
      type: 'scatter' as const,
      data: blobGroups.get(blobIndex)!,
      symbolSize: 7,
      itemStyle: {
        color: BLOB_COLORS[blobIndex] || themeColors.primary,
        opacity: 0.7,
      },
    }));

    return {
      animation: false,
      grid: {
        top: 20,
        right: 60,
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
      yAxis: {
        type: 'value' as const,
        name: 'Blob Index',
        nameLocation: 'middle' as const,
        nameGap: 50,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        min: -0.5,
        max: Math.max(...blobIndices) + 0.5,
        interval: 1,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisTick: {
          show: true,
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: (value: number) => {
            // Only show integer blob indices
            return Number.isInteger(value) ? value.toString() : '';
          },
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
      series: scatterSeries,
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { seriesName: string; data: [number, number, string] }) => {
          const continent = params.data[2];
          return `${params.seriesName}<br/>Time: ${params.data[0].toFixed(3)}s<br/>Continent: ${continent}`;
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
  }, [blobPropagationData, themeColors]);

  // Calculate statistics for header
  const { blobCount, avgPropagationTime, totalNodes } = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return { blobCount: 0, avgPropagationTime: 0, totalNodes: 0 };
    }

    const uniqueBlobs = new Set(blobPropagationData.map(p => p.blob_index));
    const total = blobPropagationData.reduce((sum, point) => sum + point.seen_slot_start_diff, 0);
    const avg = total / blobPropagationData.length;

    return {
      blobCount: uniqueBlobs.size,
      avgPropagationTime: avg,
      totalNodes: blobPropagationData.length,
    };
  }, [blobPropagationData]);

  // Handle empty data
  if (blobPropagationData.length === 0) {
    return (
      <PopoutCard title="Blob Propagation" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex min-h-[600px] items-center justify-center text-muted'
                : 'flex h-72 items-center justify-center text-muted'
            }
          >
            <p>No blob propagation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${blobCount} ${blobCount === 1 ? 'blob' : 'blobs'} • Avg: ${avgPropagationTime.toFixed(0)}ms • ${totalNodes.toLocaleString()} observations`;

  return (
    <PopoutCard title="Blob Propagation" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <div className={inModal ? 'min-h-[600px]' : 'h-72'}>
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={false}
            lazyUpdate={true}
          />
        </div>
      )}
    </PopoutCard>
  );
}
