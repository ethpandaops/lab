import type React from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { HeatmapChartProps } from './Heatmap.types';

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
  colorGradient = ['#eef2ff', '#818cf8', '#4338ca'],
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
  notMerge = false,
  lazyUpdate = true,
}: HeatmapChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

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
      containLabel: true,
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
              color: colorGradient,
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
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
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
      <ReactECharts
        key={themeColors.foreground}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
      />
    </div>
  );
}
