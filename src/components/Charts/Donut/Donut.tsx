import { type JSX, useMemo, forwardRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { DonutProps } from './Donut.types';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

// Register ECharts components
echarts.use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

/**
 * Donut - A donut/pie chart component using ECharts
 *
 * Displays data as segments in a circular donut chart with customizable
 * appearance, legend, and interactive tooltips.
 *
 * Perfect for showing:
 * - Category distributions
 * - Percentage breakdowns
 * - Part-to-whole relationships
 * - Market share visualizations
 *
 * @example
 * ```tsx
 * // Basic donut chart
 * <Donut
 *   data={[
 *     { name: 'Search Engine', value: 1048 },
 *     { name: 'Direct', value: 735 },
 *     { name: 'Email', value: 580 },
 *   ]}
 *   title="Traffic Sources"
 * />
 *
 * // Custom colors and styling
 * <Donut
 *   data={[
 *     { name: 'Passed', value: 450, color: '#22c55e' },
 *     { name: 'Failed', value: 62, color: '#ef4444' },
 *   ]}
 *   innerRadius={50}
 *   outerRadius={80}
 * />
 * ```
 */
export const Donut = forwardRef<ReactEChartsCore, DonutProps>(function Donut(
  {
    data = [],
    height = 400,
    title,
    titleFontSize = 16,
    titleFontFamily,
    titleFontWeight = 600,
    titleLeft = 'center',
    titleTop = 8,
    innerRadius = 40,
    outerRadius = 70,
    showLegend = true,
    legendPosition = 'top',
    legendOrientation = 'horizontal',
    showLabel = false,
    labelPosition = 'center',
    showCenterValue = true,
    centerValueFontSize = 40,
    animationDuration = 300,
  },
  ref
): JSX.Element {
  const themeColors = useThemeColors();

  const option = useMemo(() => {
    // Process data and assign colors from categorical palette
    const processedData = data.map((item, index) => ({
      name: item.name,
      value: item.value,
      itemStyle: {
        color: item.color || CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      },
    }));

    // Calculate legend position
    const legendConfig: Record<string, unknown> = {
      show: showLegend,
      orient: legendOrientation,
      textStyle: {
        color: themeColors.foreground,
        fontSize: 12,
      },
      itemWidth: 12,
      itemHeight: 12,
    };

    // Set legend positioning based on legendPosition
    switch (legendPosition) {
      case 'top':
        legendConfig.top = title ? 40 : 10;
        legendConfig.left = 'center';
        break;
      case 'bottom':
        legendConfig.bottom = 10;
        legendConfig.left = 'center';
        break;
      case 'left':
        legendConfig.left = 10;
        legendConfig.top = 'middle';
        break;
      case 'right':
        legendConfig.right = 10;
        legendConfig.top = 'middle';
        break;
    }

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
      tooltip: {
        trigger: 'item',
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: legendConfig,
      series: [
        {
          name: title || 'Data',
          type: 'pie',
          radius: [`${innerRadius}%`, `${outerRadius}%`],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: themeColors.surface,
            borderWidth: 2,
          },
          label: {
            show: showLabel,
            position: labelPosition,
            color: themeColors.foreground,
            fontSize: 12,
            formatter: '{b}: {d}%',
          },
          emphasis: {
            label: {
              show: showCenterValue,
              fontSize: centerValueFontSize,
              fontWeight: 'bold',
              color: themeColors.foreground,
              formatter: '{d}%',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          labelLine: {
            show: showLabel && labelPosition === 'outside',
            lineStyle: {
              color: themeColors.border,
            },
          },
          data: processedData,
        },
      ],
    };
  }, [
    data,
    title,
    titleFontSize,
    titleFontWeight,
    titleFontFamily,
    titleLeft,
    titleTop,
    innerRadius,
    outerRadius,
    showLegend,
    legendPosition,
    legendOrientation,
    showLabel,
    labelPosition,
    showCenterValue,
    centerValueFontSize,
    animationDuration,
    themeColors.foreground,
    themeColors.border,
    themeColors.background,
    themeColors.surface,
  ]);

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'}>
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
