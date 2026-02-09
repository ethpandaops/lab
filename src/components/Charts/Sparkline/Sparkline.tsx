import { useMemo, type JSX } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolveCssColorToHex, hexToRgba } from '@/utils';
import type { SparklineProps } from './Sparkline.types';

// Register minimal ECharts components
echarts.use([LineChart, GridComponent, CanvasRenderer]);

/**
 * Sparkline - A tiny inline chart for embedding in tables and tight spaces
 *
 * Renders a minimal line chart with no axes, labels, tooltips, or grid.
 * Designed for use inside table cells to show trends at a glance.
 *
 * @example
 * ```tsx
 * <Sparkline data={[98.5, 99.1, 97.8, 99.3, 98.9]} />
 * ```
 */
export function Sparkline({
  data,
  width = 120,
  height = 24,
  color,
  lineWidth = 1.5,
  showArea = false,
  areaOpacity = 0.15,
  smooth = true,
  animationDuration = 0,
}: SparklineProps): JSX.Element {
  const themeColors = useThemeColors();

  const resolvedColor = useMemo(
    () => (color ? resolveCssColorToHex(color) : themeColors.primary),
    [color, themeColors.primary]
  );

  const option = useMemo(
    () => ({
      animation: animationDuration > 0,
      animationDuration,
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: {
        type: 'category' as const,
        show: false,
        data: data.map((_, i) => i),
      },
      yAxis: {
        type: 'value' as const,
        show: false,
      },
      series: [
        {
          type: 'line' as const,
          data,
          smooth,
          symbol: 'none',
          lineStyle: { width: lineWidth, color: resolvedColor },
          areaStyle: showArea ? { color: hexToRgba(resolvedColor, areaOpacity) } : undefined,
        },
      ],
    }),
    [data, lineWidth, resolvedColor, smooth, showArea, areaOpacity, animationDuration]
  );

  return (
    <div style={{ width, height }}>
      <ReactEChartsCore echarts={echarts} option={option} style={{ width, height }} notMerge={true} lazyUpdate={true} />
    </div>
  );
}
