import type React from 'react';
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { HeatmapChartProps } from './Heatmap.types';

/**
 * HeatmapChart - A heatmap chart component using ECharts
 *
 * @example
 * ```tsx
 * <HeatmapChart
 *   data={[[0, 0, 5], [0, 1, 1], [1, 0, 3], [1, 1, 2]]}
 *   xLabels={['Monday', 'Tuesday']}
 *   yLabels={['Morning', 'Afternoon']}
 *   title="Activity Heatmap"
 * />
 * ```
 */
export function HeatmapChart({
  data = [
    [0, 0, 5],
    [0, 1, 1],
    [0, 2, 0],
    [1, 0, 1],
    [1, 1, 4],
    [1, 2, 3],
    [2, 0, 2],
    [2, 1, 5],
    [2, 2, 3],
  ],
  xLabels = ['a', 'b', 'c'],
  yLabels = ['Morning', 'Afternoon', 'Evening'],
  title,
  height = 400,
  min,
  max,
  colorGradient = ['#eef2ff', '#818cf8', '#4338ca'],
  showLabel = false,
  showVisualMap = true,
  animationDuration = 300,
  formatValue,
}: HeatmapChartProps): React.JSX.Element {
  const [themeColors] = useState(() => {
    // Get computed CSS variables from the root element on initial render
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Fallback colors
    const fallbackColors = {
      foreground: '#09090b', // fallback zinc-950
      muted: '#52525b', // fallback zinc-600
      border: '#e4e4e7', // fallback zinc-200
      background: '#ffffff',
    };

    // Extract theme colors from CSS variables
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

    return {
      foreground: foregroundColor || fallbackColors.foreground,
      muted: mutedColor || fallbackColors.muted,
      border: borderColor || fallbackColors.border,
      background: backgroundColor || fallbackColors.background,
    };
  });

  const option = {
    animation: true,
    animationDuration,
    animationEasing: 'cubicOut',
    title: title
      ? {
          text: title,
          textStyle: {
            color: themeColors.foreground,
            fontSize: 16,
            fontWeight: 600,
          },
          left: 'center',
          top: 8,
        }
      : undefined,
    grid: {
      top: title ? 48 : 16,
      right: showVisualMap ? 100 : 24,
      bottom: 32,
      left: 80,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      splitArea: {
        show: true,
      },
      axisLine: {
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      splitArea: {
        show: true,
      },
      axisLine: {
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
      },
    },
    visualMap: showVisualMap
      ? {
          min: min ?? Math.min(...data.map(d => d[2])),
          max: max ?? Math.max(...data.map(d => d[2])),
          calculable: true,
          orient: 'vertical',
          right: 10,
          top: 'center',
          inRange: {
            color: colorGradient,
          },
          textStyle: {
            color: themeColors.foreground,
            fontSize: 12,
          },
        }
      : undefined,
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data,
        label: {
          show: showLabel,
          color: themeColors.foreground,
          fontSize: 12,
          formatter: formatValue ? (params: { value: [number, number, number] }) => formatValue(params.value[2]) : undefined,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
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
      formatter: (params: { value: [number, number, number] }) => {
        const [x, y, value] = params.value;
        const formattedValue = formatValue ? formatValue(value) : value;
        return `${xLabels[x]} - ${yLabels[y]}<br/>Value: ${formattedValue}`;
      },
    },
  };

  return (
    <div className="w-full">
      <ReactECharts option={option} style={{ height, width: '100%', minHeight: height }} />
    </div>
  );
}
