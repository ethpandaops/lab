export interface HeatmapChartProps {
  /**
   * 2D chart data as [x, y, value] tuples
   * @example [[0, 0, 5], [0, 1, 1], [1, 0, 3]]
   */
  data: [number, number, number][];
  /**
   * X-axis labels
   */
  xLabels: string[];
  /**
   * Y-axis labels
   */
  yLabels: string[];
  /**
   * Chart title (displayed in ECharts)
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
  /**
   * Show cell borders for better visual distinction
   * @default false
   */
  showCellBorders?: boolean;
  /**
   * Border configuration for individual control over borders
   * Use this for directional borders (e.g., only left/right for column separation)
   */
  cellBorderConfig?: {
    borderColor?: string;
    borderWidth?: number | [number, number, number, number]; // [top, right, bottom, left]
  };
  /**
   * X-axis title
   */
  xAxisTitle?: string;
  /**
   * Y-axis title
   */
  yAxisTitle?: string;
  /**
   * Visual map type: 'continuous' for gradient, 'piecewise' for discrete ranges
   * @default 'continuous'
   */
  visualMapType?: 'continuous' | 'piecewise';
  /**
   * Piecewise color ranges for visualMap (only used when visualMapType is 'piecewise')
   * @example [
   *   { min: 0, max: 1000, color: '#22c55e' },
   *   { min: 1000, max: 2000, color: '#84cc16' },
   *   { min: 4000, color: '#ef4444' }
   * ]
   */
  piecewisePieces?: Array<{
    min?: number;
    max?: number;
    color: string;
    label?: string;
  }>;
  /**
   * Custom tooltip formatter function
   * @param params ECharts tooltip params with value [x, y, value]
   * @param xLabels X-axis labels
   * @param yLabels Y-axis labels
   * @returns Formatted tooltip HTML string
   */
  tooltipFormatter?: (params: { value: [number, number, number] }, xLabels: string[], yLabels: string[]) => string;
  /**
   * Show only min and max labels on X-axis
   * @default false
   */
  xAxisShowOnlyMinMax?: boolean;
  /**
   * Show only min and max labels on Y-axis
   * @default false
   */
  yAxisShowOnlyMinMax?: boolean;
  /**
   * X-axis label interval. 0 = show all labels, 'auto' = let ECharts decide
   * @default 'auto'
   */
  xAxisInterval?: number | 'auto' | ((index: number, value: string) => boolean);
  /**
   * Rotate X-axis labels by this many degrees
   * @default 0
   */
  xAxisLabelRotate?: number;
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
   * Custom grid configuration for chart positioning
   * Allows overriding default margins (top, right, bottom, left)
   */
  grid?: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    containLabel?: boolean;
  };
  /**
   * Whether to disable hover emphasis on cells
   * When false, hovering highlights the entire column
   * @default true
   */
  emphasisDisabled?: boolean;
  /**
   * Custom text labels for the visual map legend [max, min]
   * @example ['12s', '0s']
   */
  visualMapText?: [string, string];
  /**
   * ECharts event handlers. Keys are event names (e.g., 'click').
   */
  onEvents?: Record<string, (params: Record<string, unknown>) => void>;
  /**
   * Color for cells with values outside the visual map range (e.g., no-data sentinel cells).
   * Pass a CSS color string; it will be resolved to hex for ECharts compatibility.
   */
  emptyColor?: string;
  /**
   * Y-axis index to highlight with a background band. undefined or -1 = none.
   */
  highlightedRow?: number;
  /**
   * Reverse the y-axis so the first label appears at the top instead of the bottom.
   * @default false
   */
  yAxisInverse?: boolean;
}
