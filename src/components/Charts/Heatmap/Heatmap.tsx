import type React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { HeatmapChart as EChartsHeatmap } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import colors from 'tailwindcss/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolveCssColorToHex } from '@/utils/color';
import type { HeatmapChartProps } from './Heatmap.types';

// Register ECharts components
echarts.use([EChartsHeatmap, GridComponent, TooltipComponent, TitleComponent, VisualMapComponent, CanvasRenderer]);

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
  xAxisTitle,
  yAxisTitle,
  visualMapType = 'continuous',
  piecewisePieces,
  tooltipFormatter,
  xAxisShowOnlyMinMax = false,
  yAxisShowOnlyMinMax = false,
}: HeatmapChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedColorGradient = colorGradient.map(color => resolveCssColorToHex(color));

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
      right: showVisualMap ? 90 : 16,
      bottom: 28,
      left: 64,
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
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
        interval: xAxisShowOnlyMinMax ? (index: number) => index === 0 || index === xLabels.length - 1 : undefined,
      },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
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
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 12,
        interval: yAxisShowOnlyMinMax ? (index: number) => index === 0 || index === yLabels.length - 1 : undefined,
      },
    },
    visualMap:
      visualMapType === 'piecewise' && piecewisePieces
        ? {
            type: 'piecewise',
            pieces: piecewisePieces,
            orient: 'vertical',
            right: 10,
            top: 'center',
            show: showVisualMap,
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
          }
        : {
            type: 'continuous',
            min: min ?? Math.min(...data.map(d => d[2])),
            max: max ?? Math.max(...data.map(d => d[2])),
            calculable: true,
            orient: 'vertical',
            right: 10,
            top: 'center',
            show: showVisualMap,
            inRange: {
              color: convertedColorGradient,
            },
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
          },
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data,
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
            borderColor: themeColors.border,
            borderWidth: 1,
          }),
        },
        // ECharts has built-in hover effects; only customize if needed
        emphasis: {
          focus: 'self' as const,
        },
      },
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
    <div className="w-full">
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
