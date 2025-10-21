export interface LineChartProps {
  /**
   * Chart data series
   */
  data?: number[];
  /**
   * X-axis labels
   */
  labels?: string[];
  /**
   * Chart title
   */
  title?: string;
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
   * Connect null data points with line
   * @default false
   */
  connectNulls?: boolean;
  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
}
