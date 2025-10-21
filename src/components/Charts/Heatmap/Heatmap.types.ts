export interface HeatmapChartProps {
  /**
   * 2D chart data as [x, y, value] tuples
   * @example [[0, 0, 5], [0, 1, 1], [1, 0, 3]]
   */
  data?: [number, number, number][];
  /**
   * X-axis labels
   */
  xLabels?: string[];
  /**
   * Y-axis labels
   */
  yLabels?: string[];
  /**
   * Chart title
   */
  title?: string;
  /**
   * Height of the chart in pixels
   */
  height?: number | string;
  /**
   * Minimum value for the color scale (auto-calculated if not provided)
   */
  min?: number;
  /**
   * Maximum value for the color scale (auto-calculated if not provided)
   */
  max?: number;
  /**
   * Custom color gradient for the heatmap
   * @default ['#eef2ff', '#818cf8', '#4338ca']
   */
  colorGradient?: string[];
  /**
   * Show value labels in cells
   * @default false
   */
  showLabel?: boolean;
  /**
   * Show visual map (color legend)
   * @default true
   */
  showVisualMap?: boolean;
  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
  /**
   * Format function for tooltip and labels
   */
  formatValue?: (value: number) => string;
}
