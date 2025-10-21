import type { JSX } from 'react';
import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import { hexToRgba } from '@/utils';
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
 *
 * @example
 * ```tsx
 * <BlobDataAvailability
 *   currentTime={4.5}
 *   firstSeenData={[{ time: 1.42, blobId: '0', color: '#06b6d4' }]}
 *   availabilityRateData={[{ time: 0, nodes: 0 }, { time: 1, nodes: 25 }]}
 *   continentalPropagationData={[
 *     { continent: 'EU', data: [{ time: 1.2, percentage: 0 }, { time: 1.4, percentage: 100 }] },
 *     { continent: 'NA', data: [{ time: 1.3, percentage: 0 }, { time: 1.5, percentage: 100 }] }
 *   ]}
 * />
 * ```
 */
export function BlobDataAvailability({
  firstSeenData = [],
  availabilityRateData = [],
  continentalPropagationData = [],
  currentTime,
  maxTime = 12,
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

  // Calculate max values for Y-axis (using all data, not just visible)
  // This prevents the chart from re-scaling during animations
  const availabilityRateMax = useMemo(() => {
    const nodeCounts = availabilityRateData.map(p => p.nodes);
    return nodeCounts.length > 0 ? Math.max(...nodeCounts) : 30;
  }, [availabilityRateData]);

  // Prepare First Seen scatter chart data - only show blobs seen up to current time
  const firstSeenOption = useMemo(() => {
    const visibleData = firstSeenData.filter(point => point.time <= effectiveCurrentTime);
    const scatterData = visibleData.map(point => [point.time, point.blobId, point.color]);
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
        top: 48,
        right: 32,
        bottom: 72,
        left: 72,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        name: 'Slot Time (s)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        min: 0,
        max: maxTime,
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
      yAxis: {
        type: 'category',
        data: uniqueBlobIds,
        name: 'Blob',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
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
          return `Blob ${params.data[1]}<br/>Time: ${params.data[0]}s`;
        },
      },
      legend: {
        show: false,
        bottom: 8,
        left: 'center',
      },
    };
  }, [firstSeenData, themeColors, maxTime, effectiveCurrentTime]);

  // Prepare Data is Available Rate line chart data - only show data up to current time
  const availabilityRateOption = useMemo(() => {
    const visibleData = availabilityRateData.filter(point => point.time <= effectiveCurrentTime);
    const times = visibleData.map(p => p.time);
    const nodes = visibleData.map(p => p.nodes);

    return {
      animation: false,
      title: {
        text: 'DATA IS AVAILABLE RATE',
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
        top: 48,
        right: 32,
        bottom: 72,
        left: 72,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        name: 'Slot Time (s)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        min: 0,
        max: maxTime,
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
      yAxis: {
        type: 'value',
        name: 'Nodes',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        max: availabilityRateMax,
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
        },
      },
      series: [
        {
          data: times.map((time, idx) => [time, nodes[idx]]),
          type: 'line',
          smooth: false,
          symbol: 'none',
          showSymbol: false,
          lineStyle: {
            color: themeColors.success,
            width: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: hexToRgba(themeColors.success, 0.5),
                },
                {
                  offset: 1,
                  color: hexToRgba(themeColors.success, 0.06),
                },
              ],
            },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: themeColors.muted,
            type: 'dashed',
          },
        },
      },
      legend: {
        show: false,
        bottom: 8,
        left: 'center',
      },
    };
  }, [availabilityRateData, themeColors, maxTime, effectiveCurrentTime, availabilityRateMax]);

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
        top: 48,
        right: 32,
        bottom: 72,
        left: 72,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        name: 'Slot Time (s)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        min: 0,
        max: maxTime,
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
      yAxis: {
        type: 'value',
        name: 'Complete',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
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
        bottom: 8,
        left: 'center',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 10,
        },
        itemWidth: 16,
        itemHeight: 2,
        itemGap: 16,
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
    <div className={clsx('grid grid-cols-12 gap-4', className)}>
      {/* First Seen Chart - 4 columns */}
      <div className="col-span-4 rounded-sm border border-border bg-surface p-3">
        <ReactECharts option={firstSeenOption} style={{ height: 360, width: '100%' }} />
      </div>

      {/* Data is Available Rate Chart - 4 columns */}
      <div className="col-span-4 rounded-sm border border-border bg-surface p-3">
        <ReactECharts option={availabilityRateOption} style={{ height: 360, width: '100%' }} />
      </div>

      {/* Continental Propagation Chart - 4 columns */}
      <div className="col-span-4 rounded-sm border border-border bg-surface p-3">
        <ReactECharts option={continentalPropagationOption} style={{ height: 360, width: '100%' }} />
      </div>
    </div>
  );
}
