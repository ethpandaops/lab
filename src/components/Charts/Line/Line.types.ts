export interface LineChartProps {
  /**
   * Chart data series (null values create gaps when connectNulls is false)
   */
  data?: (number | null)[];
  /**
   * X-axis labels
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
   * Height of the chart in pixels
   */
  height?: number | string;
  /**
   * Enable smooth curve
   * @default true
   */
  smooth?: boolean | number;
  /**
   * Show area fill under the line
   * @default false
   */
  showArea?: boolean;
  /**
   * Chart color - uses theme primary color by default
   */
  color?: string;
  /**
   * Maximum value for Y-axis (optional, auto-calculated if not provided)
   */
  yMax?: number;
  /**
   * Maximum value for X-axis (optional, auto-calculated if not provided)
   */
  xMax?: number;
  /**
   * Connect null data points with line
   * @default false
   */
  connectNulls?: boolean;
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
   * X-axis label display interval (0 = all labels, 1 = every other, 2 = every third, etc.)
   * Set to 'auto' to let ECharts calculate automatically
   * @default 'auto'
   */
  xAxisLabelInterval?: number | 'auto';
  /**
   * X-axis title/name
   */
  xAxisTitle?: string;
  /**
   * Y-axis title/name
   */
  yAxisTitle?: string;
}
