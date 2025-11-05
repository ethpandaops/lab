import type { TooltipFormatter } from '@/types/echarts';

export interface BarDataItem {
  /**
   * The value of this bar
   */
  value: number;
  /**
   * Optional color for this specific bar (overrides default color)
   */
  color?: string;
  /**
   * Optional metadata attached to this bar (used in tooltips)
   */
  meta?: Record<string, unknown>;
}

export interface BarChartProps {
  /**
   * Chart data - either array of numbers or array of BarDataItem objects
   */
  data?: (number | BarDataItem)[];
  /**
   * Category labels (for x-axis in vertical bars, y-axis in horizontal bars)
   */
  labels?: string[];
  /**
   * Chart title
   */
  title?: string;
  /**
   * Title font size
   * @default 16
   */
  titleFontSize?: number;
  /**
   * Title font family
   * @default undefined (uses default)
   */
  titleFontFamily?: string;
  /**
   * Title font weight
   * @default 600
   */
  titleFontWeight?: number;
  /**
   * Title left position (pixels or 'left', 'center', 'right')
   * @default 'center'
   */
  titleLeft?: number | string;
  /**
   * Title top position (pixels)
   * @default 8
   */
  titleTop?: number;
  /**
   * Chart orientation
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Height of the chart in pixels or string
   * @default 400
   */
  height?: number | string;
  /**
   * Default bar color (can be overridden per bar via data)
   */
  color?: string;
  /**
   * Maximum value for the value axis (optional, auto-calculated if not provided)
   */
  max?: number;
  /**
   * Number of segments to split the value axis into (ensures even intervals)
   * @default 5
   */
  splitNumber?: number;
  /**
   * Bar width as percentage
   * @default '60%'
   */
  barWidth?: string | number;
  /**
   * Show labels on bars
   * @default true
   */
  showLabel?: boolean;
  /**
   * Label position
   * @default 'top' for vertical, 'right' for horizontal
   */
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'inside' | 'insideLeft' | 'insideRight';
  /**
   * Label formatter function or string template
   * @default '{c}' (shows the value)
   */
  labelFormatter?: string | ((params: { value: number }) => string);
  /**
   * Value axis name (e.g., "Count", "Amount")
   */
  axisName?: string;
  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
  /**
   * Whether to merge new options with existing chart (false) or replace entirely (true)
   * Set to false for better performance when updating frequently
   * @default false
   */
  /**
   * Whether to defer chart updates to next animation frame for better performance
   * @default true
   */
  /**
   * Custom tooltip formatter function
   * @default undefined (uses default tooltip)
   */
  tooltipFormatter?: TooltipFormatter;
  /**
   * Category axis label interval (0 = all labels, 1 = every other, 2 = every third, etc.)
   * Set to 'auto' to let ECharts calculate automatically
   * @default 'auto'
   */
  categoryLabelInterval?: number | 'auto';
}
