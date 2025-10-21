export interface HeatmapDataPoint {
  /**
   * X-axis value (column)
   */
  x: number | string;
  /**
   * Y-axis value (row)
   */
  y: number | string;
  /**
   * Value/intensity at this point
   */
  value: number;
}

export interface HeatmapProps {
  /**
   * Heatmap data as array of [x, y, value] tuples or HeatmapDataPoint objects
   */
  data?: (HeatmapDataPoint | [number | string, number | string, number])[];
  /**
   * X-axis labels
   */
  xAxisLabels?: string[];
  /**
   * Y-axis labels
   */
  yAxisLabels?: string[];
  /**
   * Chart title
   */
  title?: string;
  /**
   * Height of the chart in pixels
   */
  height?: number | string;
  /**
   * Minimum value for the color scale
   */
  min?: number;
  /**
   * Maximum value for the color scale
   */
  max?: number;
  /**
   * Color scheme - uses theme primary color by default
   * Can be a single color (will create gradient) or array of colors
   */
  colors?: string | string[];
  /**
   * Show values in cells
   * @default true
   */
  showValues?: boolean;
  /**
   * Format function for displaying values
   */
  valueFormatter?: (value: number) => string;
}
