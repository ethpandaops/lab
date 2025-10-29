import type { TooltipFormatter } from '@/types/echarts';

export interface ScatterSeries {
  /**
   * Series name shown in legend and tooltip
   */
  name: string;
  /**
   * Data points as [x, y] tuples
   */
  data: [number, number][];
  /**
   * Series color (uses theme primary if not provided)
   */
  color?: string;
  /**
   * Symbol size (pixels) or function to calculate size per point
   */
  symbolSize?: number | ((value: [number, number]) => number);
  /**
   * Symbol type
   * @default 'circle'
   */
  symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow';
  /**
   * Border color for symbol
   */
  borderColor?: string;
  /**
   * Border width for symbol
   */
  borderWidth?: number;
  /**
   * Y-axis index to use (0 or 1)
   * @default 0
   */
  yAxisIndex?: number;
  /**
   * Z-index for layering (higher = on top)
   */
  z?: number;
}

export interface LineSeries {
  /**
   * Series name shown in legend and tooltip
   */
  name: string;
  /**
   * Data points as [x, y] tuples
   */
  data: [number, number][];
  /**
   * Series color (uses theme primary if not provided)
   */
  color?: string;
  /**
   * Smooth line
   * @default true
   */
  smooth?: boolean;
  /**
   * Line width
   * @default 3
   */
  lineWidth?: number;
  /**
   * Y-axis index to use (0 or 1)
   * @default 0
   */
  yAxisIndex?: number;
  /**
   * Symbol type for line points
   * @default 'none'
   */
  symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
  /**
   * Symbol size (pixels)
   * @default 4
   */
  symbolSize?: number;
  /**
   * Z-index for layering (higher = on top)
   */
  z?: number;
  /**
   * Legend icon type
   */
  legendIcon?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow';
}

export interface ScatterAndLineChartProps {
  /**
   * Array of scatter series to display
   */
  scatterSeries?: ScatterSeries[];
  /**
   * Array of line series to display
   */
  lineSeries?: LineSeries[];
  /**
   * X-axis title/name
   */
  xAxisTitle?: string;
  /**
   * Primary Y-axis title/name (left side)
   */
  yAxisTitle?: string;
  /**
   * Secondary Y-axis title/name (right side, optional)
   */
  yAxis2Title?: string;
  /**
   * Height of the chart in pixels or percentage string
   */
  height?: number | string;
  /**
   * Custom tooltip formatter function
   */
  tooltipFormatter?: TooltipFormatter;
  /**
   * Tooltip trigger type
   * @default 'item'
   */
  tooltipTrigger?: 'item' | 'axis';
  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean;
  /**
   * Legend position
   * @default 'bottom'
   */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Legend type
   * @default 'plain'
   */
  legendType?: 'plain' | 'scroll';
  /**
   * Maximum value for X-axis (auto-calculated if not provided)
   */
  xMax?: number;
  /**
   * Maximum value for primary Y-axis (auto-calculated if not provided)
   */
  yMax?: number;
  /**
   * Maximum value for secondary Y-axis (auto-calculated if not provided)
   */
  yAxis2Max?: number;
  /**
   * Minimum value for X-axis (auto-calculated if not provided)
   */
  xMin?: number;
  /**
   * Minimum value for primary Y-axis (auto-calculated if not provided)
   */
  yMin?: number;
  /**
   * Minimum value for secondary Y-axis (auto-calculated if not provided)
   */
  yAxis2Min?: number;
  /**
   * X-axis interval for labels (auto-calculated if not provided)
   */
  xInterval?: number;
  /**
   * Custom X-axis label formatter function
   */
  xAxisFormatter?: (value: number) => string;
  /**
   * Custom Y-axis label formatter function
   */
  yAxisFormatter?: (value: number) => string;
  /**
   * Whether to merge new options with existing chart (false) or replace entirely (true)
   * @default false
   */
  /**
   * Whether to defer chart updates to next animation frame
   * @default true
   */
  /**
   * Enable animation
   * @default false
   */
  animation?: boolean;
  /**
   * Animation duration in milliseconds
   * @default 150
   */
  animationDuration?: number;
}
