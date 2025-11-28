/**
 * Box plot statistics data point
 * Represents the five-number summary for a box-and-whisker plot
 */
export type BoxPlotStats = readonly [number, number, number, number, number];

/**
 * Extended box plot data point with custom styling
 */
export interface BoxPlotDataItem {
  /**
   * Box plot statistics [min, Q1, median, Q3, max]
   */
  value: BoxPlotStats;
  /**
   * Custom item style (color, border, etc.)
   */
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

/**
 * Single series data for box plot
 */
export interface BoxPlotData {
  /**
   * Series name (e.g., "Blob 0", "Dataset A")
   * Displayed in legend and tooltips
   */
  name: string;
  /**
   * Array of box plot statistics [min, Q1, median, Q3, max]
   * Each array represents one box in the series
   * Can be either raw stats or objects with value and itemStyle
   */
  data: (BoxPlotStats | BoxPlotDataItem)[];
  /**
   * Optional color for this series
   * If not provided, uses theme primary color or auto-colors
   */
  color?: string;
}

export interface BoxPlotProps {
  /**
   * Array of series to display on the box plot
   * Each series can have multiple data points
   */
  series: BoxPlotData[];
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
   * X-axis title
   */
  xAxisTitle?: string;
  /**
   * Y-axis title
   */
  yAxisTitle?: string;
  /**
   * Y-axis label formatter function
   * @default undefined
   */
  yAxisFormatter?: (value: number) => string;
  /**
   * Height of the chart in pixels or string
   * @default 400
   */
  height?: number | string;
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
   * Category labels for x-axis (optional, uses index if not provided)
   */
  categories?: string[];
  /**
   * Maximum value for y-axis (optional, auto-calculated if not provided)
   */
  yMax?: number;
  /**
   * Minimum value for y-axis (optional, auto-calculated if not provided)
   */
  yMin?: number;
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
   * Box width as percentage
   * @default '60%'
   */
  boxWidth?: string | number;
}
