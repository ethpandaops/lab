import type React from 'react';
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { hexToRgba } from '@/utils';
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
  titleAlign: _titleAlign = 'center',
  titleFontSize = 16,
  titleFontFamily,
  titleFontWeight = 600,
  titleLeft = 'center',
  titleTop = 8,
  height = 400,
  smooth = true,
  showArea = false,
  color,
  yMax,
  xMax,
  connectNulls = false,
  animationDuration = 300,
  notMerge = false,
  lazyUpdate = true,
  xAxisLabelInterval = 'auto',
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
    animation: true,
    animationDuration,
    animationEasing: 'cubicOut',
    title: title
      ? {
          text: title,
          textStyle: {
            color: themeColors.foreground,
            fontSize: titleFontSize,
            fontWeight: titleFontWeight,
            fontFamily: titleFontFamily,
          },
          left: titleLeft,
          top: titleTop,
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
      max: xMax !== undefined ? xMax : undefined,
      axisLine: {
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
        interval: xAxisLabelInterval,
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
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'}>
      <ReactECharts
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
      />
    </div>
  );
}
