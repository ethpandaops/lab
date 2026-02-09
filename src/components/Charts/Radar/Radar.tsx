import { useMemo, type JSX } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { RadarChart as EChartsRadar } from 'echarts/charts';
import { TitleComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { hexToRgba, resolveCssColorToHex } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { RadarChartProps } from './Radar.types';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

// Register ECharts components
echarts.use([EChartsRadar, TitleComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

/**
 * RadarChart - A multi-dimensional comparison chart using ECharts
 *
 * Displays one or more data series as overlaid polygons on a radar/spider chart.
 * Perfect for comparing multiple entities across several dimensions.
 *
 * @example
 * ```tsx
 * <RadarChart
 *   indicators={[
 *     { name: 'Attack', max: 100 },
 *     { name: 'Defense', max: 100 },
 *     { name: 'Speed', max: 100 },
 *     { name: 'Stamina', max: 100 },
 *   ]}
 *   series={[
 *     { name: 'Player A', values: [80, 70, 90, 85] },
 *     { name: 'Player B', values: [75, 85, 70, 80] },
 *   ]}
 * />
 * ```
 */
export function RadarChart({
  series,
  indicators,
  title,
  titleFontSize = 16,
  titleFontFamily,
  titleFontWeight = 600,
  titleLeft = 'center',
  titleTop = 8,
  height = 400,
  animationDuration = 300,
  showLegend = true,
  legendPosition = 'bottom',
  shape = 'polygon',
  radius = 65,
  lineWidth = 2,
  showSymbol = false,
  symbolSize = 6,
  colorPalette,
}: RadarChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Convert OKLCH colors if provided
  const convertedColorPalette = colorPalette?.map(color => resolveCssColorToHex(color));
  const extendedPalette = convertedColorPalette || CHART_CATEGORICAL_COLORS;

  const option = useMemo(() => {
    // Build radar configuration
    const radarConfig = {
      shape,
      radius: `${radius}%`,
      indicator: indicators.map(ind => ({
        name: ind.name,
        max: ind.max,
        min: ind.min ?? 0,
      })),
      axisName: {
        color: themeColors.muted,
        fontSize: 12,
      },
      axisLine: {
        lineStyle: {
          color: themeColors.border,
        },
      },
      splitLine: {
        lineStyle: {
          color: themeColors.border,
          opacity: 0.3,
        },
      },
      splitArea: {
        show: false,
      },
    };

    // Build series configuration
    const seriesConfig = series.map((s, index) => {
      const seriesColor = s.color ? resolveCssColorToHex(s.color) : extendedPalette[index % extendedPalette.length];

      return {
        type: 'radar' as const,
        name: s.name,
        data: [
          {
            value: s.values,
            name: s.name,
          },
        ],
        symbol: showSymbol ? 'circle' : 'none',
        symbolSize,
        lineStyle: {
          width: lineWidth,
          color: seriesColor,
        },
        itemStyle: {
          color: seriesColor,
        },
        areaStyle: {
          color: hexToRgba(seriesColor, s.areaOpacity ?? 0.2),
        },
        emphasis: {
          lineStyle: {
            width: lineWidth + 1,
          },
          areaStyle: {
            opacity: (s.areaOpacity ?? 0.2) + 0.1,
          },
        },
      };
    });

    return {
      animation: true,
      animationDuration,
      animationEasing: 'cubicOut' as const,
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
      legend: showLegend
        ? {
            show: true,
            [legendPosition]: legendPosition === 'bottom' ? 10 : 10,
            left: 'center' as const,
            textStyle: {
              color: themeColors.foreground,
              fontSize: 12,
            },
            itemWidth: 14,
            itemHeight: 10,
            itemGap: 16,
            data: series.map((s, index) => ({
              name: s.name,
              itemStyle: {
                color: s.color ? resolveCssColorToHex(s.color) : extendedPalette[index % extendedPalette.length],
              },
            })),
          }
        : undefined,
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { name: string; value: number[] }): string => {
          const { name, value } = params;
          let result = `<div style="font-weight: 600; margin-bottom: 4px;">${name}</div>`;
          indicators.forEach((ind, i) => {
            const val = value[i];
            const percentage = ind.max > 0 ? ((val / ind.max) * 100).toFixed(1) : '0.0';
            result += `<div style="display: flex; justify-content: space-between; gap: 16px;">`;
            result += `<span>${ind.name}:</span>`;
            result += `<span style="font-weight: 600;">${val.toFixed(1)} (${percentage}%)</span>`;
            result += `</div>`;
          });
          return result;
        },
      },
      radar: radarConfig,
      series: seriesConfig,
    };
  }, [
    series,
    indicators,
    title,
    titleFontSize,
    titleFontWeight,
    titleFontFamily,
    titleLeft,
    titleTop,
    animationDuration,
    showLegend,
    legendPosition,
    shape,
    radius,
    lineWidth,
    showSymbol,
    symbolSize,
    extendedPalette,
    themeColors.foreground,
    themeColors.muted,
    themeColors.border,
    themeColors.surface,
  ]);

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={false}
        lazyUpdate={true}
      />
    </div>
  );
}
