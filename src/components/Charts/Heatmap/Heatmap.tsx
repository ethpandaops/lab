import type React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { HeatmapChart as EChartsHeatmap } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  VisualMapComponent,
  MarkAreaComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import colors from 'tailwindcss/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolveCssColorToHex } from '@/utils/color';
import type { HeatmapChartProps } from './Heatmap.types';

// Register ECharts components
echarts.use([
  EChartsHeatmap,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  VisualMapComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

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
  data,
  xLabels,
  yLabels,
  title,
  height = 400,
  min,
  max,
  colorGradient = [colors.indigo[50], colors.indigo[400], colors.indigo[700]],
  showLabel = false,
  showVisualMap = true,
  animationDuration = 300,
  formatValue,
  showCellBorders = false,
  cellBorderConfig,
  xAxisTitle,
  yAxisTitle,
  visualMapType = 'continuous',
  piecewisePieces,
  tooltipFormatter,
  xAxisShowOnlyMinMax = false,
  yAxisShowOnlyMinMax = false,
  xAxisInterval = 'auto',
  xAxisLabelRotate = 0,
  grid,
  emphasisDisabled = true,
  visualMapText,
  onEvents,
  emptyColor,
  highlightedRow,
  yAxisInverse = false,
}: HeatmapChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedColorGradient = colorGradient.map(color => resolveCssColorToHex(color));
  const resolvedEmptyColor = emptyColor ? resolveCssColorToHex(emptyColor) : undefined;

  // Split data: real values go through the visual map, sentinel (-1) cells render with fixed emptyColor.
  // This prevents the continuous visualMap from clamping -1 to the min color.
  const NO_DATA_SENTINEL = -1;
  const realData = emptyColor ? data.filter(d => d[2] !== NO_DATA_SENTINEL) : data;
  const emptyData = emptyColor ? data.filter(d => d[2] === NO_DATA_SENTINEL) : [];

  const hasHighlight = highlightedRow !== undefined && highlightedRow >= 0 && highlightedRow < yLabels.length;
  // Highlight overlay series index: after main heatmap (0) and optional no-data series (1)
  const highlightSeriesIndex = 1 + (emptyData.length > 0 ? 1 : 0);

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
      top: title ? 40 : 16,
      right: showVisualMap ? 90 : 24,
      bottom: 50,
      left: 60,
      ...grid,
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      name: xAxisTitle,
      nameLocation: 'middle',
      nameGap: 25,
      nameTextStyle: {
        color: themeColors.foreground,
        fontSize: 12,
        fontWeight: 600,
      },
      splitArea: {
        show: false,
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: themeColors.border,
        },
      },
      splitLine: {
        show: false,
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 10,
        rotate: xAxisLabelRotate,
        interval: xAxisShowOnlyMinMax ? (index: number) => index === 0 || index === xLabels.length - 1 : xAxisInterval,
      },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      inverse: yAxisInverse,
      name: yAxisTitle,
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        color: themeColors.foreground,
        fontSize: 12,
        fontWeight: 600,
      },
      splitArea: {
        show: false,
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: themeColors.border,
        },
      },
      splitLine: {
        show: false,
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
        interval: yAxisShowOnlyMinMax ? (index: number) => index === 0 || index === yLabels.length - 1 : undefined,
      },
    },
    visualMap: [
      visualMapType === 'piecewise' && piecewisePieces
        ? {
            type: 'piecewise' as const,
            pieces: piecewisePieces,
            orient: 'vertical' as const,
            right: 10,
            top: 'center',
            show: showVisualMap,
            seriesIndex: 0,
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
            ...(resolvedEmptyColor && { outOfRange: { color: resolvedEmptyColor } }),
          }
        : {
            type: 'continuous' as const,
            min: min ?? Math.min(...data.map(d => d[2])),
            max: max ?? Math.max(...data.map(d => d[2])),
            calculable: false,
            orient: 'vertical' as const,
            right: 10,
            top: 'center',
            show: showVisualMap,
            seriesIndex: 0,
            inRange: {
              color: convertedColorGradient,
            },
            ...(resolvedEmptyColor && { outOfRange: { color: resolvedEmptyColor } }),
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
            text: visualMapText ?? ['4s', '0s'],
            itemWidth: 15,
            itemHeight: Math.min(100, (typeof height === 'number' ? height : 400) * 0.4),
          },
      // Dummy visual map for the no-data series so ECharts doesn't error
      ...(emptyData.length > 0
        ? [
            {
              type: 'piecewise' as const,
              show: false,
              seriesIndex: 1,
              pieces: [{ min: -2, max: 0, color: resolvedEmptyColor ?? themeColors.background }],
            },
          ]
        : []),
      // Dummy visual map for the highlight overlay series
      ...(hasHighlight
        ? [
            {
              type: 'piecewise' as const,
              show: false,
              seriesIndex: highlightSeriesIndex,
              pieces: [{ min: 0, max: 0, color: 'transparent' }],
            },
          ]
        : []),
    ],
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data: realData,
        label: {
          show: showLabel,
          color: themeColors.foreground,
          fontSize: 12,
          formatter: formatValue
            ? (params: { value: [number, number, number] }) => formatValue(params.value[2])
            : undefined,
        },
        itemStyle: {
          ...(showCellBorders && {
            borderColor: themeColors.background,
            borderWidth: 2,
          }),
          ...(cellBorderConfig && {
            borderColor: cellBorderConfig.borderColor ?? themeColors.background,
            borderWidth: cellBorderConfig.borderWidth ?? 2,
          }),
        },
        // ECharts hover effects: subtle highlight on hover
        emphasis: {
          disabled: emphasisDisabled,
          itemStyle: {
            borderColor: themeColors.foreground,
            borderWidth: 2,
          },
        },
      },
      // Separate series for no-data sentinel cells so they bypass the visual map entirely
      ...(emptyData.length > 0
        ? [
            {
              name: 'No Data',
              type: 'heatmap' as const,
              data: emptyData,
              label: { show: false },
              itemStyle: {
                color: resolvedEmptyColor,
                ...(showCellBorders && {
                  borderColor: themeColors.background,
                  borderWidth: 2,
                }),
                ...(cellBorderConfig && {
                  borderColor: cellBorderConfig.borderColor ?? themeColors.background,
                  borderWidth: cellBorderConfig.borderWidth ?? 2,
                }),
              },
              emphasis: { disabled: true },
            },
          ]
        : []),
      // Row highlight band as a separate overlay series so it renders above heatmap cells
      ...(hasHighlight
        ? [
            {
              type: 'heatmap' as const,
              data: [],
              z: 10,
              silent: true,
              markArea: {
                silent: true,
                itemStyle: {
                  color: resolveCssColorToHex(themeColors.primary) + '30',
                  borderColor: resolveCssColorToHex(themeColors.primary) + '80',
                  borderWidth: 2,
                },
                data: [[{ yAxis: yLabels[highlightedRow] }, { yAxis: yLabels[highlightedRow] }]],
              },
            },
          ]
        : []),
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
      formatter: tooltipFormatter
        ? (params: { value: [number, number, number] }) => tooltipFormatter(params, xLabels, yLabels)
        : (params: { value: [number, number, number] }) => {
            const [x, y, value] = params.value;
            const formattedValue = formatValue ? formatValue(value) : value;
            return `${xLabels[x]} - ${yLabels[y]}<br/>Value: ${formattedValue}`;
          },
    },
  };

  return (
    <div className="h-full w-full">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={false}
        lazyUpdate={true}
        onEvents={onEvents}
      />
    </div>
  );
}
