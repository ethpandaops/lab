import { type JSX, useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart as EChartsLine } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { hexToRgba, resolveCssColorToHex } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LineChartProps } from './Line.types';

// Register ECharts components
echarts.use([EChartsLine, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

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
  xAxisLabelInterval = 'auto',
  xAxisTitle,
  yAxisTitle,
}: LineChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedColor = color ? resolveCssColorToHex(color) : undefined;

  const option = useMemo(
    () => ({
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
        top: title ? 40 : 16,
        right: undefined,
        bottom: xAxisTitle ? 50 : 30,
        left: yAxisTitle ? 60 : 8,
        // ECharts v6: use outerBounds instead of deprecated containLabel
        outerBoundsMode: 'same' as const,
        outerBoundsContain: 'axisLabel' as const,
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        max: xMax !== undefined ? xMax : undefined,
        name: xAxisTitle,
        nameLocation: 'middle',
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
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
          interval: xAxisLabelInterval,
        },
      },
      yAxis: {
        type: 'value',
        max: yMax,
        name: yAxisTitle,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
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
            color: convertedColor || themeColors.primary,
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
                      color: hexToRgba(convertedColor || themeColors.primary, 0.5),
                    },
                    {
                      offset: 1,
                      color: hexToRgba(convertedColor || themeColors.primary, 0.06),
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
    }),
    [
      data,
      labels,
      title,
      titleFontSize,
      titleFontWeight,
      titleFontFamily,
      titleLeft,
      titleTop,
      smooth,
      showArea,
      convertedColor,
      yMax,
      xMax,
      connectNulls,
      animationDuration,
      xAxisLabelInterval,
      xAxisTitle,
      yAxisTitle,
      themeColors.foreground,
      themeColors.border,
      themeColors.muted,
      themeColors.primary,
      themeColors.background,
    ]
  );

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'} style={{ pointerEvents: 'none' }}>
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
