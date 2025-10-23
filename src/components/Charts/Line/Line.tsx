import type React from 'react';
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { hexToRgba } from '@/utils';
import { DEFAULT_CHART_COLORS } from '@/theme/data-visualization-colors';
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
  yMax,
  connectNulls = false,
  animationDuration = 300,
}: LineChartProps): React.JSX.Element {
  const [themeColors] = useState(() => {
    // Get computed CSS variables from the root element on initial render
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

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
      primary: primaryColor || DEFAULT_CHART_COLORS.primary,
      foreground: foregroundColor || DEFAULT_CHART_COLORS.foreground,
      muted: mutedColor || DEFAULT_CHART_COLORS.muted,
      border: borderColor || DEFAULT_CHART_COLORS.border,
      background: backgroundColor || DEFAULT_CHART_COLORS.background,
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
      max: yMax,
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
        connectNulls,
        symbol: 'none',
        showSymbol: false,
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
                    color: hexToRgba(color || themeColors.primary, 0.5),
                  },
                  {
                    offset: 1,
                    color: hexToRgba(color || themeColors.primary, 0.06),
                  },
                ],
              },
            }
          : undefined,
        emphasis: {
          lineStyle: {
            width: 4,
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
