/**
 * Configuration for a single data series in the chart
 */
export interface SeriesData {
  /**
   * Series name (shown in legend and tooltip)
   */
  name: string;
  /**
   * Series data - either simple values (for category x-axis) or [x, y] tuples (for value x-axis)
   */
  data: number[] | Array<[number, number]> | (number | null)[];
  /**
   * Series color (hex or rgb)
   */
  color?: string;
  /**
   * Whether the series is visible
   * @default true
   */
  visible?: boolean;
  /**
   * Enable smooth curve for this series
   * @default false
   */
  smooth?: boolean | number;
  /**
   * Show area fill under the line
   * @default false
   */
  showArea?: boolean;
  /**
   * Show symbols (dots) on data points
   * @default false
   */
  showSymbol?: boolean;
  /**
   * Symbol size in pixels
   * @default 4
   */
  symbolSize?: number;
  /**
   * Line width in pixels
   * @default 2
   */
  lineWidth?: number;
  /**
   * Line style
   * @default 'solid'
   */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

/**
 * X-axis configuration
 */
export interface XAxisConfig {
  /**
   * Axis type
   * - 'category': Uses string labels (e.g., days of week)
   * - 'value': Uses numeric values (e.g., slot numbers)
   */
  type: 'category' | 'value';
  /**
   * Axis name/label
   */
  name?: string;
  /**
   * Category labels (required when type is 'category')
   */
  labels?: string[];
  /**
   * Minimum value (only for type 'value')
   */
  min?: number | 'dataMin';
  /**
   * Maximum value (only for type 'value')
   */
  max?: number | 'dataMax';
  /**
   * Value formatter function
   */
  formatter?: (value: number | string) => string;
}

/**
 * Y-axis configuration
 */
export interface YAxisConfig {
  /**
   * Axis name/label
   */
  name?: string;
  /**
   * Minimum value
   */
  min?: number | 'dataMin';
  /**
   * Maximum value
   */
  max?: number | 'dataMax';
  /**
   * Value formatter function
   */
  formatter?: (value: number) => string;
}

/**
 * MultiLineChart component props
 */
export interface MultiLineChartProps {
  /**
   * Array of data series to display
   */
  series: SeriesData[];
  /**
   * X-axis configuration
   */
  xAxis: XAxisConfig;
  /**
   * Y-axis configuration
   */
  yAxis?: YAxisConfig;
  /**
   * Chart title
   */
  title?: string;
  /**
   * Chart subtitle/description (only shown when using card wrapper)
   */
  subtitle?: string;
  /**
   * Height of the chart in pixels
   * @default 400
   */
  height?: number | string;
  /**
   * Show interactive legend with toggle buttons for each series
   * @default false
   */
  showLegend?: boolean;
  /**
   * Wrap chart in a card container with title and subtitle
   * @default false
   */
  showCard?: boolean;
  /**
   * Enable zoom and pan controls
   * @default false
   */
  enableDataZoom?: boolean;
  /**
   * Custom tooltip formatter
   */
  tooltipFormatter?: (params: unknown) => string;
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
   * Grid padding configuration
   */
  grid?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /**
   * Custom color palette for series without explicit colors.
   * If not provided, defaults to [primary, accent, ...SERIES_COLORS].
   * Series with explicit color values will use those instead.
   */
  colorPalette?: string[];
}
