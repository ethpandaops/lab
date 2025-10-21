import type React from 'react';
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { addOpacity } from '@/utils';
import type { LineChartProps } from './Line.types';

/**
 * LineChart - A smoothed line chart component using ECharts
 *
 * @example
 * ```tsx
 * <LineChart
 *   data={[820, 932, 901, 934, 1290, 1330, 1320]}
 *   labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
 *   title="Weekly Data"
 * />
 * ```
 */
export function LineChart({
  data = [820, 932, 901, 934, 1290, 1330, 1320],
  labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  title,
  height = 400,
  smooth = true,
  showArea = false,
  color,
}: LineChartProps): React.JSX.Element {
  const [themeColors] = useState(() => {
    // Get computed CSS variables from the root element on initial render
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Fallback colors
    const fallbackColors = {
      primary: '#06b6d4', // fallback cyan-500
      foreground: '#09090b', // fallback zinc-950
      muted: '#52525b', // fallback zinc-600
      border: '#e4e4e7', // fallback zinc-200
      background: '#ffffff',
    };

    // Extract theme colors from CSS variables
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

    return {
      primary: primaryColor || fallbackColors.primary,
      foreground: foregroundColor || fallbackColors.foreground,
      muted: mutedColor || fallbackColors.muted,
      border: borderColor || fallbackColors.border,
      background: backgroundColor || fallbackColors.background,
    };
  });

  const option = {
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
      right: 24,
      bottom: 32,
      left: 48,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
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
      type: 'value',
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: themeColors.border,
          type: 'dashed',
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
      },
    },
    series: [
      {
        data,
        type: 'line',
        smooth,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: color || themeColors.primary,
          borderWidth: 2,
          borderColor: themeColors.background,
        },
        lineStyle: {
          color: color || themeColors.primary,
          width: 3,
        },
        areaStyle: showArea
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: addOpacity(color || themeColors.primary, 0.5), // 50% opacity
                  },
                  {
                    offset: 1,
                    color: addOpacity(color || themeColors.primary, 0.06), // 6% opacity
                  },
                ],
              },
            }
          : undefined,
        emphasis: {
          scale: true,
          scaleSize: 12,
          itemStyle: {
            color: color || themeColors.primary,
            borderWidth: 3,
            borderColor: themeColors.background,
            shadowBlur: 10,
            shadowColor: addOpacity(color || themeColors.primary, 0.25), // 25% opacity
          },
          lineStyle: {
            color: color || themeColors.primary,
            width: 3,
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
  };

  return (
    <div className="w-full">
      <ReactECharts option={option} style={{ height, width: '100%', minHeight: height }} />
    </div>
  );
}
