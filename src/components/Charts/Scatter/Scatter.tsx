import type { JSX } from 'react';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ScatterChartProps } from './Scatter.types';

/**
 * ScatterChart - A scatter plot component using ECharts
 *
 * Displays data points as scattered dots, supports multiple series,
 * custom tooltips, and axis titles.
 *
 * @example
 * ```tsx
 * <ScatterChart
 *   series={[
 *     {
 *       name: 'Series A',
 *       data: [[1, 2], [3, 4], [5, 6]],
 *       color: '#FF6B6B',
 *       symbolSize: 8,
 *     },
 *   ]}
 *   xAxisTitle="Time (s)"
 *   yAxisTitle="Value"
 *   height={400}
 * />
 * ```
 */
export function ScatterChart({
  series,
  xAxisTitle,
  yAxisTitle,
  height = 400,
  tooltipFormatter,
  showLegend = true,
  legendPosition = 'top',
  xMax,
  yMax,
  xMin,
  yMin,
  notMerge = false,
  lazyUpdate = true,
}: ScatterChartProps): JSX.Element {
  const themeColors = useThemeColors();

  const option = useMemo(
    () => ({
      animation: false,
      grid: {
        top: 10,
        right: 10,
        bottom: legendPosition === 'bottom' ? 80 : 30,
        left: 10,
        containLabel: true,
      },
      xAxis: {
        type: 'value' as const,
        name: xAxisTitle,
        nameLocation: 'middle' as const,
        nameGap: 30,
        nameTextStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        min: xMin,
        max: xMax,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
        },
        splitLine: {
          lineStyle: {
            color: themeColors.border,
            type: 'dashed' as const,
          },
        },
      },
      yAxis: {
        type: 'value' as const,
        name: yAxisTitle,
        nameLocation: 'middle' as const,
        nameGap: 50,
        nameTextStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        min: yMin,
        max: yMax,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
        },
        splitLine: {
          lineStyle: {
            color: themeColors.border,
            type: 'dashed' as const,
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
        formatter: tooltipFormatter,
      },
      legend: showLegend
        ? {
            show: true,
            [legendPosition]: legendPosition === 'top' || legendPosition === 'bottom' ? 8 : 'center',
            orient:
              legendPosition === 'left' || legendPosition === 'right' ? ('vertical' as const) : ('horizontal' as const),
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
          }
        : undefined,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        type: 'scatter' as const,
        symbolSize: s.symbolSize ?? 8,
        itemStyle: {
          color: s.color ?? themeColors.primary,
        },
      })),
    }),
    [
      series,
      xAxisTitle,
      yAxisTitle,
      xMax,
      yMax,
      xMin,
      yMin,
      tooltipFormatter,
      showLegend,
      legendPosition,
      themeColors.foreground,
      themeColors.border,
      themeColors.muted,
      themeColors.primary,
      themeColors.background,
    ]
  );

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
