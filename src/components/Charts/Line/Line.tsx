import { type JSX, useMemo, forwardRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart as EChartsLine } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { hexToRgba, resolveCssColorToHex } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { LineChartProps } from './Line.types';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

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
export const LineChart = forwardRef<ReactEChartsCore, LineChartProps>(function LineChart(
  {
    data = [820, 932, 901, 934, 1290, 1330, 1320],
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    title,
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
  },
  ref
): JSX.Element {
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
        // ECharts 6 automatically handles label overflow prevention
        // Use minimal padding and let ECharts handle the rest
        top: title ? 40 : 16,
        right: 16,
        bottom: xAxisTitle ? 50 : 30,
        left: yAxisTitle ? 60 : 16,
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
            color: convertedColor || CHART_CATEGORICAL_COLORS[0],
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
                      color: hexToRgba(convertedColor || CHART_CATEGORICAL_COLORS[0], 0.5),
                    },
                    {
                      offset: 1,
                      color: hexToRgba(convertedColor || CHART_CATEGORICAL_COLORS[0], 0.06),
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
      themeColors.background,
    ]
  );

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'} style={{ pointerEvents: 'none' }}>
      <ReactEChartsCore
        ref={ref}
        echarts={echarts}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
});
