import type { JSX } from 'react';
import { useState, useMemo, memo } from 'react';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import type { BlobDataAvailabilityProps } from './BlobDataAvailability.types';

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
  firstSeenData = [],
  availabilityRateData: _availabilityRateData = [],
  continentalPropagationData = [],
  currentTime,
  maxTime = 12000,
  className,
}: BlobDataAvailabilityProps): JSX.Element {
  // Default currentTime to maxTime to show all data if not specified
  const effectiveCurrentTime = currentTime ?? maxTime;
  const [themeColors] = useState(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    const fallbackColors = {
      primary: '#06b6d4',
      foreground: '#09090b',
      muted: '#52525b',
      border: '#e4e4e7',
      background: '#ffffff',
      success: '#22c55e',
    };

    const primaryColor =
      computedStyle.getPropertyValue('--color-primary').trim() ||
      computedStyle.getPropertyValue('--color-cyan-500').trim();
    const foregroundColor =
      computedStyle.getPropertyValue('--color-foreground').trim() ||
      computedStyle.getPropertyValue('--color-zinc-950').trim();
    const mutedColor =
      computedStyle.getPropertyValue('--color-muted').trim() ||
      computedStyle.getPropertyValue('--color-zinc-600').trim();
    const borderColor =
      computedStyle.getPropertyValue('--color-border').trim() ||
      computedStyle.getPropertyValue('--color-zinc-200').trim();
    const backgroundColor = computedStyle.getPropertyValue('--color-background').trim() || '#ffffff';
    const successColor =
      computedStyle.getPropertyValue('--color-success').trim() ||
      computedStyle.getPropertyValue('--color-green-500').trim();

    return {
      primary: primaryColor || fallbackColors.primary,
      foreground: foregroundColor || fallbackColors.foreground,
      muted: mutedColor || fallbackColors.muted,
      border: borderColor || fallbackColors.border,
      background: backgroundColor || fallbackColors.background,
      success: successColor || fallbackColors.success,
    };
  });

  // Prepare First Seen scatter chart data - only show blobs seen up to current time
  const firstSeenOption = useMemo(() => {
    const visibleData = firstSeenData.filter(point => point.time <= effectiveCurrentTime);

    // Deduplicate by blobId - only show the FIRST time each blob was seen
    const blobFirstSeenMap = new Map<string, { time: number; color?: string }>();
    visibleData.forEach(point => {
      const existing = blobFirstSeenMap.get(point.blobId);
      if (!existing || point.time < existing.time) {
        blobFirstSeenMap.set(point.blobId, { time: point.time, color: point.color });
      }
    });

    const scatterData = Array.from(blobFirstSeenMap.entries()).map(([blobId, data]) => [data.time, blobId, data.color]);
    const uniqueBlobIds = [...new Set(firstSeenData.map(p => p.blobId))].sort();

    return {
      animation: false,
      title: {
        text: 'FIRST SEEN',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'monospace',
        },
        left: 16,
        top: 12,
      },
      grid: {
        top: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Slot Time (s)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 10,
        },
        min: 0,
        max: maxTime,
        interval: 4000, // Show labels at 0s, 4s, 8s, 12s
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: (value: number) => Math.round(value / 1000),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: themeColors.border,
            type: 'solid',
            opacity: 0.3,
          },
        },
      },
      yAxis: {
        type: 'category',
        data: uniqueBlobIds,
        name: 'Blob',
        nameLocation: 'middle',
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
            type: 'solid',
            opacity: 0.3,
          },
        },
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: 8,
          itemStyle: {
            color: (params: { data: [number, string, string | undefined] }) => {
              return params.data[2] || themeColors.primary;
            },
          },
        },
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { data: [number, string] }) => {
          return `Blob ${params.data[1]}<br/>Time: ${(params.data[0] / 1000).toFixed(2)}s`;
        },
      },
      legend: {
        show: false,
        bottom: 8,
        left: 'center',
      },
    };
  }, [firstSeenData, themeColors, maxTime, effectiveCurrentTime]);

  // Prepare Data is Available Rate line chart data - show full 0-12s range with null for future values
  // Prepare Continental Propagation chart data - CDF per continent, only show data up to current time
  const continentalPropagationOption = useMemo(() => {
    // Default colors for continents
    const defaultColors = [
      '#ec4899', // pink for first continent
      '#22c55e', // green
      '#06b6d4', // cyan
      '#f59e0b', // amber
      '#3b82f6', // blue
      '#a855f7', // purple
    ];

    // Filter each continent's data to only show points up to current time
    const visiblePropagationData = continentalPropagationData.map(continent => ({
      ...continent,
      data: continent.data.filter(point => point.time <= effectiveCurrentTime),
    }));

    // Calculate dynamic x-axis range based on active data
    // Find the time range where meaningful propagation happens (0% to 100%)
    let minActiveTime = Infinity;
    let maxActiveTime = -Infinity;

    visiblePropagationData.forEach(continent => {
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
      animation: false,
      title: {
        text: 'CONTINENTAL PROPAGATION',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'monospace',
        },
        left: 16,
        top: 12,
      },
      grid: {
        top: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Slot Time (s)',
        nameLocation: 'middle',
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
            type: 'solid',
            opacity: 0.3,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Complete',
        nameLocation: 'middle',
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
            type: 'solid',
            opacity: 0.3,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
          formatter: '{value}%',
        },
      },
      series: visiblePropagationData.map((continent, idx) => ({
        name: continent.continent,
        data: continent.data.map(point => [point.time, point.percentage]),
        type: 'line',
        step: 'end',
        symbol: 'none',
        showSymbol: false,
        lineStyle: {
          color: continent.color || defaultColors[idx % defaultColors.length],
          width: 2,
        },
      })),
      legend: {
        show: visiblePropagationData.length > 0,
        orient: 'horizontal',
        bottom: 4,
        left: 'center',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 9,
        },
        itemWidth: 14,
        itemHeight: 2,
        itemGap: 12,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { seriesName: string; data: [number, number] }[]) => {
          if (!params || params.length === 0) return '';
          const time = (params[0].data[0] / 1000).toFixed(2);
          const lines = [`Time: ${time}s`];
          params.forEach(param => {
            lines.push(`${param.seriesName}: ${param.data[1].toFixed(1)}%`);
          });
          return lines.join('<br/>');
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: themeColors.muted,
            type: 'dashed',
          },
        },
      },
    };
  }, [continentalPropagationData, themeColors, maxTime, effectiveCurrentTime]);

  return (
    <div className={clsx('grid h-full grid-cols-12 gap-4', className)}>
      {/* First Seen Chart - 6 columns */}
      <div className="col-span-6 h-full rounded-sm border border-border bg-surface p-2">
        <ReactECharts
          option={firstSeenOption}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>

      {/* Continental Propagation Chart - 6 columns */}
      <div className="col-span-6 h-full rounded-sm border border-border bg-surface p-2">
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

export const BlobDataAvailability = memo(BlobDataAvailabilityComponent);
