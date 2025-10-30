import { useMemo, type JSX } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { GaugeProps } from './Gauge.types';

// Register ECharts components
echarts.use([GaugeChart, TitleComponent, CanvasRenderer]);

/**
 * Gauge - Radial/circular progress indicator using ECharts
 *
 * Displays one or more gauge charts in a grid layout. Each gauge shows
 * a percentage completion with a circular progress indicator.
 *
 * Perfect for showing metrics like:
 * - Participation rates
 * - Correctness percentages
 * - Health scores
 * - Completion status
 *
 * @example
 * ```tsx
 * // Single gauge
 * <Gauge
 *   data={[
 *     { name: 'Participation', value: 450, max: 512 }
 *   ]}
 *   title="Validator Participation"
 * />
 *
 * // Multiple gauges with custom colors
 * <Gauge
 *   data={[
 *     { name: 'Participation', value: 450, max: 512, color: '#22c55e' },
 *     { name: 'Head Correct', value: 440, max: 512, color: '#3b82f6' },
 *     { name: 'Source Correct', value: 435, max: 512, color: '#8b5cf6' },
 *   ]}
 * />
 * ```
 */
export function Gauge({
  data = [],
  height = 300,
  title,
  titleFontSize = 16,
  titleFontFamily,
  titleFontWeight = 600,
  titleLeft = 'center',
  titleTop = 8,
  animationDuration = 800,
  showPercentage = true,
  percentageDecimals = 1,
  radius = 70,
  gaugeWidth = 15,
}: GaugeProps): JSX.Element {
  const themeColors = useThemeColors();

  const option = useMemo(() => {
    // Calculate grid layout based on number of gauges
    const gaugeCount = data.length;
    const columns = gaugeCount === 1 ? 1 : gaugeCount === 2 ? 2 : gaugeCount <= 4 ? 2 : 3;
    const rows = Math.ceil(gaugeCount / columns);

    // Create series for each gauge
    const series = data.map((item, index) => {
      const percentage = item.max > 0 ? (item.value / item.max) * 100 : 0;

      // Calculate grid position
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cellWidth = 100 / columns;
      const cellHeight = 100 / rows;

      return {
        type: 'gauge' as const,
        radius: `${radius}%`,
        // Position in grid
        center: [`${col * cellWidth + cellWidth / 2}%`, `${row * cellHeight + cellHeight / 2}%`],
        startAngle: 225,
        endAngle: -45,
        min: 0,
        max: 100,
        splitNumber: 4,
        progress: {
          show: true,
          width: gaugeWidth,
          itemStyle: {
            color: item.color || themeColors.primary,
          },
        },
        axisLine: {
          lineStyle: {
            width: gaugeWidth,
            color: [[1, themeColors.border]],
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        pointer: {
          show: false,
        },
        title: {
          show: true,
          offsetCenter: [0, '85%'],
          fontSize: 12,
          color: themeColors.muted,
          fontWeight: 500,
        },
        detail: {
          show: showPercentage,
          valueAnimation: true,
          fontSize: gaugeCount === 1 ? 32 : gaugeCount <= 4 ? 24 : 18,
          fontWeight: 600,
          color: themeColors.foreground,
          offsetCenter: [0, '10%'],
          formatter: (value: number) => {
            const displayValue = value.toFixed(percentageDecimals);
            return `${displayValue}%`;
          },
        },
        data: [
          {
            value: percentage,
            name: item.name,
            detail: {
              show: showPercentage,
            },
          },
        ],
      };
    });

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
      series,
    };
  }, [
    data,
    title,
    titleFontSize,
    titleFontWeight,
    titleFontFamily,
    titleLeft,
    titleTop,
    animationDuration,
    showPercentage,
    percentageDecimals,
    radius,
    gaugeWidth,
    themeColors.foreground,
    themeColors.muted,
    themeColors.border,
    themeColors.primary,
  ]);

  return (
    <div className={height === '100%' ? 'h-full w-full' : 'w-full'}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        notMerge={true}
        autoResize={false}
        lazyUpdate={false}
      />
    </div>
  );
}
