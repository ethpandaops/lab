import { type JSX, useMemo, forwardRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart as EChartsBar } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { BarChartProps } from './Bar.types';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

// Register ECharts components
echarts.use([EChartsBar, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

/**
 * BarChart - A versatile bar chart component using ECharts
 *
 * Supports both vertical and horizontal orientations, custom colors per bar,
 * and flexible labeling options.
 *
 * @example
 * ```tsx
 * // Simple vertical bars
 * <BarChart
 *   data={[120, 200, 150, 80, 70, 110]}
 *   labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
 *   title="Monthly Sales"
 * />
 *
 * // Horizontal bars with custom colors
 * <BarChart
 *   data={[
 *     { value: 120, color: '#ff0000' },
 *     { value: 200, color: '#00ff00' },
 *     { value: 150, color: '#0000ff' },
 *   ]}
 *   labels={['Product A', 'Product B', 'Product C']}
 *   orientation="horizontal"
 * />
 * ```
 */
export const BarChart = forwardRef<ReactEChartsCore, BarChartProps>(function BarChart(
  {
    data = [],
    labels = [],
    title,
    titleFontSize = 16,
    titleFontFamily,
    titleFontWeight = 600,
    titleLeft = 'center',
    titleTop = 8,
    orientation = 'vertical',
    height = 400,
    color,
    max,
    barWidth = '60%',
    showLabel = true,
    labelPosition,
    labelFormatter = '{c}',
    axisName,
    animationDuration = 300,
    tooltipFormatter,
    categoryLabelInterval = 'auto',
  },
  ref
): JSX.Element {
  const themeColors = useThemeColors();

  const option = useMemo(() => {
    // Default label position based on orientation
    const defaultLabelPosition = orientation === 'vertical' ? 'top' : 'right';
    const actualLabelPosition = labelPosition || defaultLabelPosition;

    // Process data to extract values and colors
    const processedData = data.map(item => {
      if (typeof item === 'number') {
        return {
          value: item,
          itemStyle: {
            color: color || CHART_CATEGORICAL_COLORS[0],
          },
        };
      }
      return {
        value: item.value,
        itemStyle: {
          color: item.color || color || CHART_CATEGORICAL_COLORS[0],
        },
      };
    });

    // Determine axis configurations based on orientation
    const isHorizontal = orientation === 'horizontal';
    const valueAxisConfig = {
      type: 'value' as const,
      name: axisName,
      nameLocation: 'middle' as const,
      nameGap: isHorizontal ? 40 : 50,
      nameTextStyle: {
        color: themeColors.foreground,
        fontSize: 12,
      },
      max,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 11,
      },
      splitLine: {
        lineStyle: {
          color: themeColors.border,
          type: 'dashed' as const,
        },
      },
    };

    const categoryAxisConfig = {
      type: 'category' as const,
      data: labels,
      axisLine: {
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: themeColors.foreground,
        fontSize: 11,
        interval: categoryLabelInterval,
      },
    };

    // Calculate grid padding based on orientation and axis names
    const gridPadding = {
      top: title ? 52 : 10,
      right: isHorizontal && axisName ? 50 : 20,
      bottom: !isHorizontal && axisName ? 50 : 30,
      left: isHorizontal && axisName ? 60 : 20,
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
      grid: gridPadding,
      xAxis: isHorizontal ? valueAxisConfig : categoryAxisConfig,
      yAxis: isHorizontal ? categoryAxisConfig : valueAxisConfig,
      series: [
        {
          type: 'bar' as const,
          data: processedData,
          barWidth,
          emphasis: {
            disabled: true,
          },
          blur: {
            itemStyle: {
              opacity: 1,
            },
          },
          label: showLabel
            ? {
                show: true,
                position: actualLabelPosition,
                color: themeColors.foreground,
                fontSize: 11,
                formatter: labelFormatter,
              }
            : undefined,
        },
      ],
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: tooltipFormatter,
      },
    };
  }, [
    data,
    labels,
    title,
    titleFontSize,
    titleFontWeight,
    titleFontFamily,
    titleLeft,
    titleTop,
    orientation,
    color,
    max,
    barWidth,
    showLabel,
    labelPosition,
    labelFormatter,
    axisName,
    animationDuration,
    tooltipFormatter,
    categoryLabelInterval,
    themeColors.foreground,
    themeColors.border,
    themeColors.muted,
    themeColors.background,
  ]);

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'}>
      <ReactEChartsCore
        ref={ref}
        echarts={echarts}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
});
