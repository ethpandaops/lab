import { type JSX, useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BoxplotChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { BoxPlotProps } from './BoxPlot.types';

// Register ECharts components
echarts.use([BoxplotChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

/**
 * BoxPlot - A box-and-whisker plot component using ECharts
 *
 * Displays statistical distributions showing min, Q1, median, Q3, and max values.
 * Supports multiple series with custom colors and responsive tooltips.
 *
 * @example
 * ```tsx
 * // Single series
 * <BoxPlot
 *   series={[
 *     {
 *       name: "Dataset",
 *       data: [
 *         [10, 20, 30, 40, 50],  // [min, Q1, median, Q3, max]
 *         [15, 25, 35, 45, 55],
 *       ],
 *     },
 *   ]}
 * />
 *
 * // Multiple series with colors
 * <BoxPlot
 *   series={[
 *     { name: "Blob 0", data: [[10, 20, 30, 40, 50]], color: "#3b82f6" },
 *     { name: "Blob 1", data: [[15, 25, 35, 45, 55]], color: "#10b981" },
 *   ]}
 *   yAxisTitle="Latency (ms)"
 *   showLegend={true}
 * />
 *
 * // Calculate stats from raw data
 * import { calculateBoxPlotStats } from './utils';
 * const stats = calculateBoxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * <BoxPlot
 *   series={[{ name: "Data", data: [stats] }]}
 * />
 * ```
 */
export function BoxPlot({
  series = [],
  title,
  titleFontSize = 16,
  titleFontFamily,
  titleFontWeight = 600,
  titleLeft = 'center',
  titleTop = 8,
  xAxisTitle,
  yAxisTitle,
  yAxisFormatter,
  height = 400,
  showLegend = true,
  legendPosition = 'bottom',
  categories,
  yMax,
  yMin,
  animationDuration = 300,
  boxWidth = '60%',
}: BoxPlotProps): JSX.Element {
  const themeColors = useThemeColors();

  const option = useMemo(() => {
    // Default color palette if series don't have colors
    const defaultColors = [
      themeColors.primary,
      themeColors.secondary,
      themeColors.accent,
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
    ];

    // Process series data and assign colors
    const processedSeries = series.map((s, index) => ({
      name: s.name,
      type: 'boxplot' as const,
      data: s.data,
      itemStyle: {
        color: s.color || defaultColors[index % defaultColors.length],
        borderColor: s.color || defaultColors[index % defaultColors.length],
      },
      barWidth: boxWidth,
    }));

    // Calculate number of data points for x-axis
    const maxDataLength = Math.max(...series.map(s => s.data.length), 1);
    const xAxisData = categories || Array.from({ length: maxDataLength }, (_, i) => String(i + 1));

    // Legend configuration
    const legendConfig =
      showLegend && series.length > 1
        ? {
            data: series.map(s => s.name),
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
            [legendPosition]: legendPosition === 'top' || legendPosition === 'bottom' ? 0 : 10,
          }
        : undefined;

    // Calculate grid padding based on legend position
    const getGridPadding = (): { top: number; right: number; bottom: number; left: number } => {
      const basePadding = { top: title ? 52 : 10, right: 20, bottom: 40, left: 20 };

      if (showLegend && series.length > 1) {
        if (legendPosition === 'top') basePadding.top += 30;
        if (legendPosition === 'bottom') basePadding.bottom += 30;
        if (legendPosition === 'left') basePadding.left += 100;
        if (legendPosition === 'right') basePadding.right += 100;
      }

      return basePadding;
    };

    return {
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
      legend: legendConfig,
      grid: {
        ...getGridPadding(),
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        data: xAxisData,
        name: xAxisTitle,
        nameLocation: 'middle' as const,
        nameGap: 30,
        nameTextStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value' as const,
        name: yAxisTitle,
        nameLocation: 'middle' as const,
        nameGap: 65,
        nameTextStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        min: yMin,
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
            type: 'dashed' as const,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
          formatter: yAxisFormatter,
        },
      },
      series: processedSeries,
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { seriesName: string; name: string; value: number[] }) => {
          const [min, q1, median, q3, max] = params.value;
          return `
            <div style="font-weight: 600; margin-bottom: 4px;">${params.seriesName}</div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div>Max: ${max.toFixed(2)}</div>
              <div>Q3: ${q3.toFixed(2)}</div>
              <div>Median: ${median.toFixed(2)}</div>
              <div>Q1: ${q1.toFixed(2)}</div>
              <div>Min: ${min.toFixed(2)}</div>
            </div>
          `;
        },
      },
    };
  }, [
    series,
    title,
    titleFontSize,
    titleFontWeight,
    titleFontFamily,
    titleLeft,
    titleTop,
    xAxisTitle,
    yAxisTitle,
    yAxisFormatter,
    showLegend,
    legendPosition,
    categories,
    yMax,
    yMin,
    animationDuration,
    boxWidth,
    themeColors.foreground,
    themeColors.border,
    themeColors.muted,
    themeColors.primary,
    themeColors.secondary,
    themeColors.accent,
    themeColors.background,
  ]);

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}
