import type React from 'react';
import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { addOpacity } from '@/utils';
import type { HeatmapProps } from './Heatmap.types';

/**
 * Heatmap - A heatmap chart component using ECharts
 *
 * @example
 * ```tsx
 * <Heatmap
 *   data={[
 *     [0, 0, 5], [0, 1, 1], [0, 2, 0],
 *     [1, 0, 1], [1, 1, 7], [1, 2, 2],
 *     [2, 0, 3], [2, 1, 2], [2, 2, 6]
 *   ]}
 *   xAxisLabels={['Mon', 'Tue', 'Wed']}
 *   yAxisLabels={['Morning', 'Afternoon', 'Evening']}
 *   title="Activity Heatmap"
 * />
 * ```
 */
export function Heatmap({
  data = [],
  xAxisLabels = [],
  yAxisLabels = [],
  title,
  height = 400,
  min,
  max,
  colors,
  showValues = true,
  valueFormatter = (value: number) => String(value),
}: HeatmapProps): React.JSX.Element {
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

  // Normalize data to [x, y, value] format
  const normalizedData = useMemo(() => {
    return data.map(item => {
      if (Array.isArray(item)) {
        return item;
      }
      // Convert object format to array format
      const xIndex = typeof item.x === 'number' ? item.x : xAxisLabels.indexOf(String(item.x));
      const yIndex = typeof item.y === 'number' ? item.y : yAxisLabels.indexOf(String(item.y));
      return [xIndex !== -1 ? xIndex : item.x, yIndex !== -1 ? yIndex : item.y, item.value];
    });
  }, [data, xAxisLabels, yAxisLabels]);

  // Calculate min/max if not provided
  const [minValue, maxValue] = useMemo(() => {
    if (min !== undefined && max !== undefined) {
      return [min, max];
    }
    if (normalizedData.length === 0) {
      return [0, 100];
    }
    const values = normalizedData.map(d => (d as number[])[2]);
    return [min ?? Math.min(...values), max ?? Math.max(...values)];
  }, [normalizedData, min, max]);

  // Generate color gradient
  const colorGradient = useMemo(() => {
    if (colors) {
      if (typeof colors === 'string') {
        // Single color - create gradient from light to dark
        return [
          { offset: 0, color: addOpacity(colors, 0.1) },
          { offset: 0.5, color: addOpacity(colors, 0.5) },
          { offset: 1, color: colors },
        ];
      }
      // Multiple colors - distribute evenly
      return colors.map((color, index) => ({
        offset: index / (colors.length - 1),
        color,
      }));
    }
    // Default gradient using theme primary
    return [
      { offset: 0, color: addOpacity(themeColors.primary, 0.1) },
      { offset: 0.5, color: addOpacity(themeColors.primary, 0.5) },
      { offset: 1, color: themeColors.primary },
    ];
  }, [colors, themeColors.primary]);

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
      top: title ? 60 : 24,
      right: 80,
      bottom: 60,
      left: 80,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: xAxisLabels,
      splitArea: {
        show: true,
        areaStyle: {
          color: [addOpacity(themeColors.background, 0.5), addOpacity(themeColors.border, 0.1)],
        },
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
      data: yAxisLabels,
      splitArea: {
        show: true,
        areaStyle: {
          color: [addOpacity(themeColors.background, 0.5), addOpacity(themeColors.border, 0.1)],
        },
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
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: 0,
      top: title ? 80 : 40,
      textStyle: {
        color: themeColors.foreground,
        fontSize: 11,
      },
      inRange: {
        color: colorGradient.map(c => c.color),
      },
    },
    series: [
      {
        name: title || 'Heatmap',
        type: 'heatmap',
        data: normalizedData,
        label: {
          show: showValues,
          color: themeColors.foreground,
          fontSize: 11,
          formatter: (params: { value: number[] }) => {
            const value = params.value[2];
            return valueFormatter(value);
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: addOpacity(themeColors.foreground, 0.5),
            borderColor: themeColors.foreground,
            borderWidth: 2,
          },
        },
        itemStyle: {
          borderColor: themeColors.background,
          borderWidth: 2,
        },
      },
    ],
    tooltip: {
      position: 'top',
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      borderWidth: 1,
      textStyle: {
        color: themeColors.foreground,
        fontSize: 12,
      },
      formatter: (params: { value: number[]; name?: string }) => {
        const [x, y, value] = params.value;
        const xLabel = xAxisLabels[x as number] || x;
        const yLabel = yAxisLabels[y as number] || y;
        return `${yLabel} - ${xLabel}<br/><strong>${valueFormatter(value)}</strong>`;
      },
    },
  };

  return (
    <div className="w-full">
      <ReactECharts option={option} style={{ height, width: '100%', minHeight: height }} />
    </div>
  );
}
