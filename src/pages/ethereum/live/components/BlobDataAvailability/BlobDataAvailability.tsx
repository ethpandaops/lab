import type { JSX } from 'react';
import { useMemo, memo } from 'react';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { BlobDataAvailabilityProps } from './BlobDataAvailability.types';
import { CONTINENT_COLORS } from '@/theme/data-visualization-colors';
import type { EChartsOption } from 'echarts';

/**
 * BlobDataAvailability - Page-specific component for visualizing blob data availability
 *
 * Displays three charts:
 * 1. First Seen - Scatter plot showing when blobs were first seen
 * 2. Data is Available Rate - Line chart showing node availability over time
 * 3. Continental Proportion - Step chart showing cumulative distribution
 *
 * Charts only render data up to the current slot time, simulating live progression.
 * All time values are in milliseconds. Axis labels and tooltips display values in seconds for readability.
 *
 * @example
 * ```tsx
 * <BlobDataAvailability
 *   currentTime={4500}
 *   firstSeenData={[{ time: 1420, blobId: '0', color: '#06b6d4' }]}
 *   availabilityRateData={[{ time: 0, nodes: 0 }, { time: 1000, nodes: 25 }]}
 *   continentalPropagationData={[
 *     { continent: 'EU', data: [{ time: 1200, percentage: 0 }, { time: 1400, percentage: 100 }] },
 *     { continent: 'NA', data: [{ time: 1300, percentage: 0 }, { time: 1500, percentage: 100 }] }
 *   ]}
 * />
 * ```
 */
function BlobDataAvailabilityComponent({
  deduplicatedBlobData,
  visibleContinentalPropagationData,
  currentTime: _currentTime,
  maxTime = 12000,
  className,
}: BlobDataAvailabilityProps): JSX.Element {
  const themeColors = useThemeColors();

  // Static base configuration for First Seen chart (theme-dependent but data-independent)
  const firstSeenBaseConfig = useMemo(
    () => ({
      animation: false,
      title: {
        text: 'BLOB FIRST SEEN',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 13,
        },
        left: 16,
        top: 12,
      },
      grid: {
        top: 48,
        bottom: 20,
        containLabel: true,
      },
      xAxis: {
        type: 'value' as const,
        name: 'Slot Time (s)',
        nameLocation: 'middle' as const,
        nameGap: 25,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 10,
        },
        min: 0,
        max: maxTime,
        interval: 4000,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: (value: number) => `${Math.round(value / 1000)}`,
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
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: any) => {
          const data = params.data as [number, string];
          return `Blob ${data[1]}<br/>Time: ${(data[0] / 1000).toFixed(2)}s`;
        },
      },
      legend: {
        show: false,
        bottom: 8,
        left: 'center' as const,
      },
    }),
    [themeColors, maxTime]
  );

  // Static base configuration for Continental Propagation chart
  const continentalPropagationBaseConfig = useMemo(
    () => ({
      animation: false,
      title: {
        text: 'CONTINENTAL PROPAGATION',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 13,
        },
        left: 16,
        top: 12,
      },
      grid: {
        top: 48,
        bottom: 40, // Increased to make room for legend
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!params || !Array.isArray(params) || params.length === 0) return '';
          const time = ((params[0].data as [number, number])[0] / 1000).toFixed(2);
          const lines = [`Time: ${time}s`];
          params.forEach((param: any) => {
            const data = param.data as [number, number];
            lines.push(`${param.seriesName}: ${data[1].toFixed(1)}%`);
          });
          return lines.join('<br/>');
        },
        axisPointer: {
          type: 'line' as const,
          lineStyle: {
            color: themeColors.muted,
            type: 'dashed' as const,
          },
        },
      },
    }),
    [themeColors]
  );

  // Prepare First Seen scatter chart - only recreate when data changes
  const firstSeenOption = useMemo((): EChartsOption => {
    const scatterData = deduplicatedBlobData.map(blob => [blob.time, blob.blobId, blob.color]);
    const uniqueBlobIds = [...new Set(deduplicatedBlobData.map(b => b.blobId))].sort();

    return {
      ...firstSeenBaseConfig,
      yAxis: {
        type: 'category' as const,
        data: uniqueBlobIds,
        name: 'Blob',
        nameLocation: 'middle' as const,
        nameGap: 40,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
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
      series: [
        {
          type: 'scatter' as const,
          data: scatterData,
          symbolSize: 8,
          itemStyle: {
            color: (params: { data: [number, string, string | undefined] }) => {
              return params.data[2] || themeColors.primary;
            },
          },
        },
      ],
    } as EChartsOption;
  }, [deduplicatedBlobData, firstSeenBaseConfig, themeColors]);

  // Prepare Continental Propagation chart - only recreate when data changes
  const continentalPropagationOption = useMemo((): EChartsOption => {
    // Fallback colors array from CONTINENT_COLORS for unknown continents
    const defaultColors = Object.values(CONTINENT_COLORS);

    // Calculate dynamic x-axis range based on active data
    // Find the time range where meaningful propagation happens (0% to 100%)
    let minActiveTime = Infinity;
    let maxActiveTime = -Infinity;

    visibleContinentalPropagationData.forEach(continent => {
      if (continent.data.length === 0) return;

      // Find first point above 0% and last point before 100%
      const firstActivePoint = continent.data.find(p => p.percentage > 0);
      const lastActivePoint = [...continent.data].reverse().find(p => p.percentage < 100);

      if (firstActivePoint) {
        minActiveTime = Math.min(minActiveTime, firstActivePoint.time);
      }
      if (lastActivePoint) {
        maxActiveTime = Math.max(maxActiveTime, lastActivePoint.time);
      }
    });

    // Add padding to the range for better visibility (10% on each side)
    const hasActiveData = minActiveTime !== Infinity && maxActiveTime !== -Infinity;
    const dataRange = hasActiveData ? maxActiveTime - minActiveTime : 0;
    const padding = Math.max(dataRange * 0.1, 500); // At least 500ms padding

    const xAxisMin = hasActiveData ? Math.max(0, minActiveTime - padding) : 0;
    const xAxisMax = hasActiveData ? Math.min(maxTime, maxActiveTime + padding) : maxTime;

    return {
      ...continentalPropagationBaseConfig,
      xAxis: {
        type: 'value' as const,
        name: 'Slot Time (s)',
        nameLocation: 'middle' as const,
        nameGap: 25,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 10,
        },
        min: xAxisMin,
        max: xAxisMax,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: (value: number) => (value / 1000).toFixed(1),
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
        name: 'Complete',
        nameLocation: 'middle' as const,
        nameGap: 40,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 10,
        },
        max: 100,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: themeColors.border,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: '{value}%',
        },
      },
      series: visibleContinentalPropagationData.map((continent, idx) => ({
        name: continent.continent,
        data: continent.data.map(point => [point.time, point.percentage]),
        type: 'line' as const,
        step: 'end' as const,
        symbol: 'none' as const,
        showSymbol: false,
        lineStyle: {
          color: continent.color || defaultColors[idx % defaultColors.length],
          width: 2,
        },
      })),
      legend: {
        show: visibleContinentalPropagationData.length > 0,
        orient: 'horizontal' as const,
        bottom: 4,
        left: 'center' as const,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 9,
        },
        itemWidth: 14,
        itemHeight: 2,
        itemGap: 12,
      },
    } as EChartsOption;
  }, [visibleContinentalPropagationData, continentalPropagationBaseConfig, themeColors, maxTime]);

  return (
    <div className={clsx('grid h-full grid-cols-12 gap-4', className)}>
      {/* First Seen Chart - 6 columns */}
      <div className="col-span-6 h-full rounded-sm border border-border bg-surface p-1">
        <ReactECharts
          option={firstSeenOption}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>

      {/* Continental Propagation Chart - 6 columns */}
      <div className="col-span-6 h-full rounded-sm border border-border bg-surface p-1">
        <ReactECharts
          option={continentalPropagationOption}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: BlobDataAvailabilityProps, nextProps: BlobDataAvailabilityProps): boolean => {
  return (
    prevProps.deduplicatedBlobData === nextProps.deduplicatedBlobData &&
    prevProps.visibleContinentalPropagationData === nextProps.visibleContinentalPropagationData &&
    prevProps.maxTime === nextProps.maxTime
  );
};

export const BlobDataAvailability = memo(BlobDataAvailabilityComponent, arePropsEqual);
