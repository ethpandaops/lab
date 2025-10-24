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
}

export interface ScatterChartProps {
  /**
   * Array of scatter series to display
   */
  series: ScatterSeries[];
  /**
   * X-axis title/name
   */
  xAxisTitle?: string;
  /**
   * Y-axis title/name
   */
  yAxisTitle?: string;
  /**
   * Height of the chart in pixels or percentage string
   */
  height?: number | string;
  /**
   * Custom tooltip formatter function
   */
  tooltipFormatter?: (params: any) => string;
  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean;
  /**
   * Legend position
   * @default 'top'
   */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Maximum value for X-axis (auto-calculated if not provided)
   */
  xMax?: number;
  /**
   * Maximum value for Y-axis (auto-calculated if not provided)
   */
  yMax?: number;
  /**
   * Minimum value for X-axis (auto-calculated if not provided)
   */
  xMin?: number;
  /**
   * Minimum value for Y-axis (auto-calculated if not provided)
   */
  yMin?: number;
  /**
   * Whether to merge new options with existing chart (false) or replace entirely (true)
   * @default false
   */
  notMerge?: boolean;
  /**
   * Whether to defer chart updates to next animation frame
   * @default true
   */
  lazyUpdate?: boolean;
}
