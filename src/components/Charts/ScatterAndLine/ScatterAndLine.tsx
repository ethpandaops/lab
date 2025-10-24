import type { JSX } from 'react';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ScatterAndLineChartProps } from './ScatterAndLine.types';

/**
 * ScatterAndLineChart - A combined scatter and line chart component using ECharts
 *
 * Displays both scatter points and line series on the same chart.
 * Supports dual Y-axes for different data scales.
 *
 * @example
 * ```tsx
 * <ScatterAndLineChart
 *   scatterSeries={[
 *     {
 *       name: 'Data Points',
 *       data: [[1, 2], [3, 4], [5, 6]],
 *       color: '#FF6B6B',
 *       symbolSize: 8,
 *       yAxisIndex: 0,
 *     },
 *   ]}
 *   lineSeries={[
 *     {
 *       name: 'Trend',
 *       data: [[1, 50], [3, 75], [5, 100]],
 *       color: '#4ECDC4',
 *       yAxisIndex: 1,
 *     },
 *   ]}
 *   xAxisTitle="Time (s)"
 *   yAxisTitle="Count"
 *   yAxis2Title="Percentage"
 *   height={400}
 * />
 * ```
 */
export function ScatterAndLineChart({
  scatterSeries = [],
  lineSeries = [],
  xAxisTitle,
  yAxisTitle,
  yAxis2Title,
  height = 400,
  tooltipFormatter,
  tooltipTrigger = 'item',
  showLegend = true,
  legendPosition = 'bottom',
  legendType = 'plain',
  xMax,
  yMax,
  yAxis2Max,
  xMin,
  yMin,
  yAxis2Min,
  xInterval,
  xAxisFormatter,
  yAxisFormatter,
  notMerge = false,
  lazyUpdate = true,
  animation = false,
  animationDuration = 150,
}: ScatterAndLineChartProps): JSX.Element {
  const themeColors = useThemeColors();

  const option = useMemo(
    () => ({
      animation,
      animationDuration,
      grid: {
        top: 20,
        right: yAxis2Title ? 80 : 24,
        bottom: showLegend && legendPosition === 'bottom' ? 80 : 48,
        left: 64,
        containLabel: true,
      },
      xAxis: {
        type: 'value' as const,
        name: xAxisTitle,
        nameLocation: 'middle' as const,
        nameGap: 32,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 12,
        },
        min: xMin,
        max: xMax,
        interval: xInterval,
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
          formatter: xAxisFormatter,
        },
        splitLine: {
          lineStyle: {
            color: themeColors.border,
            type: 'dashed' as const,
          },
        },
      },
      yAxis: [
        // Primary Y-axis (left)
        {
          type: 'value' as const,
          name: yAxisTitle,
          nameLocation: 'middle' as const,
          nameGap: 48,
          nameTextStyle: {
            color: themeColors.muted,
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
          axisLabel: {
            color: themeColors.muted,
            fontSize: 12,
            formatter: yAxisFormatter,
          },
          splitLine: {
            lineStyle: {
              color: themeColors.border,
              type: 'dashed' as const,
            },
          },
        },
        // Secondary Y-axis (right) - only if yAxis2Title is provided
        ...(yAxis2Title
          ? [
              {
                type: 'value' as const,
                name: yAxis2Title,
                nameLocation: 'middle' as const,
                nameGap: 50,
                nameTextStyle: {
                  color: themeColors.muted,
                  fontSize: 12,
                },
                min: yAxis2Min,
                max: yAxis2Max,
                axisLine: {
                  show: false,
                },
                axisTick: {
                  show: false,
                },
                axisLabel: {
                  color: themeColors.muted,
                  fontSize: 12,
                },
                splitLine: {
                  show: false,
                },
              },
            ]
          : []),
      ],
      tooltip: {
        trigger: tooltipTrigger,
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
            type: legendType,
            [legendPosition]: legendPosition === 'top' || legendPosition === 'bottom' ? 8 : 'center',
            orient:
              legendPosition === 'left' || legendPosition === 'right' ? ('vertical' as const) : ('horizontal' as const),
            textStyle: {
              color: themeColors.foreground,
              fontSize: legendType === 'scroll' ? 11 : 12,
            },
            pageTextStyle:
              legendType === 'scroll'
                ? {
                    color: themeColors.muted,
                  }
                : undefined,
            data: [...scatterSeries, ...lineSeries].map(s => {
              const icon = 'legendIcon' in s && s.legendIcon ? s.legendIcon : undefined;
              return icon ? { name: s.name, icon } : s.name;
            }),
          }
        : undefined,
      series: [
        // Scatter series
        ...scatterSeries.map(s => ({
          name: s.name,
          data: s.data,
          type: 'scatter' as const,
          symbol: s.symbol ?? 'circle',
          symbolSize: s.symbolSize ?? 8,
          itemStyle: {
            color: s.color ?? themeColors.primary,
            borderColor: s.borderColor,
            borderWidth: s.borderWidth,
          },
          yAxisIndex: s.yAxisIndex ?? 0,
          z: s.z,
        })),
        // Line series
        ...lineSeries.map(s => ({
          name: s.name,
          data: s.data,
          type: 'line' as const,
          smooth: s.smooth ?? true,
          connectNulls: false,
          symbol: s.symbol ?? 'none',
          symbolSize: s.symbolSize ?? 4,
          lineStyle: {
            color: s.color ?? themeColors.primary,
            width: s.lineWidth ?? 3,
          },
          itemStyle: {
            color: s.color ?? themeColors.primary,
          },
          emphasis:
            s.symbol && s.symbol !== 'none'
              ? {
                  lineStyle: {
                    width: (s.lineWidth ?? 3) + 1,
                  },
                }
              : undefined,
          yAxisIndex: s.yAxisIndex ?? 0,
          z: s.z,
        })),
      ],
    }),
    [
      scatterSeries,
      lineSeries,
      xAxisTitle,
      yAxisTitle,
      yAxis2Title,
      xMax,
      yMax,
      yAxis2Max,
      xMin,
      yMin,
      yAxis2Min,
      xInterval,
      xAxisFormatter,
      yAxisFormatter,
      tooltipFormatter,
      tooltipTrigger,
      showLegend,
      legendPosition,
      legendType,
      animation,
      animationDuration,
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
