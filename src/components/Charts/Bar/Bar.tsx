import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { BarChartProps } from './Bar.types';

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
export function BarChart({
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
  notMerge = false,
  lazyUpdate = true,
  tooltipFormatter,
  categoryLabelInterval = 'auto',
}: BarChartProps): JSX.Element {
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
            color: color || themeColors.primary,
          },
        };
      }
      return {
        value: item.value,
        itemStyle: {
          color: item.color || color || themeColors.primary,
        },
      };
    });

    // Determine axis configurations based on orientation
    const isHorizontal = orientation === 'horizontal';
    const valueAxisConfig = {
      type: 'value' as const,
      name: axisName,
      nameLocation: 'middle' as const,
      nameGap: isHorizontal ? 30 : 50,
      nameTextStyle: {
        color: themeColors.foreground,
        fontSize: 12,
      },
      max,
      axisLine: {
        lineStyle: {
          color: themeColors.border,
        },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 10,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: themeColors.border,
          type: 'solid' as const,
          opacity: 0.3,
        },
      },
    };

    const categoryAxisConfig = {
      type: 'category' as const,
      data: labels,
      axisLine: {
        show: true,
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
      grid: {
        top: title ? 52 : 10,
        right: 10,
        bottom: 30,
        left: 10,
        containLabel: true,
      },
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
    themeColors.primary,
    themeColors.background,
  ]);

  return (
    <div
      className={height === '100%' ? 'h-full w-full' : 'w-full'}
      onWheel={() => {
        // Allow page scroll by not stopping propagation
        // This prevents the chart from blocking page scroll
      }}
    >
      <ReactECharts
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
