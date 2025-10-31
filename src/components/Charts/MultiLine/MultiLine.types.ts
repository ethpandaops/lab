/**
 * Data point in object format with additional metadata for tooltips
 */
export interface EnrichedDataPoint {
  /** The [x, y] coordinates */
  value: [number, number];
  /** Additional metadata for tooltip display */
  [key: string]: unknown;
}

/**
 * Configuration for a single data series in the chart
 */
export interface SeriesData {
  /**
   * Series name (shown in legend and tooltip)
   */
  name: string;
  /**
   * Series data - simple values, [x, y] tuples, or objects with value and metadata
   * Object format allows storing additional data for enhanced tooltips
   * Supports null values for missing data points
   */
  data: number[] | Array<[number, number]> | Array<[number, number | null]> | (number | null)[] | EnrichedDataPoint[];
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
   * Opacity of the area fill (0-1)
   * If not specified, uses a gradient from 0.5 to 0.06
   * @default undefined (gradient)
   */
  areaOpacity?: number;
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
  /**
   * Step type for creating step-line charts (right-angle transitions)
   * - false: Normal line
   * - 'start': Step before point
   * - 'middle': Step at midpoint
   * - 'end': Step after point
   * @default false
   */
  step?: false | 'start' | 'middle' | 'end';
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
   * Minimum interval between axis labels (ensures integer-only ticks for count data)
   * @example 1 // For count data - prevents fractional values like 3.5
   */
  minInterval?: number;
  /**
   * Value formatter function
   */
  formatter?: (value: number) => string;
  /**
   * Maximum decimal places for smart formatting in tooltips
   * Defaults to 2 if no custom tooltipFormatter is provided
   * Tooltips will show decimals only when needed (e.g., 100 instead of 100.00)
   * Set to undefined to disable automatic smart formatting
   * @default 2 (when no custom tooltipFormatter)
   * @example 2 // Shows "99.5" or "100" instead of "99.50" or "100.00"
   */
  valueDecimals?: number;
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
   * Tooltip trigger mode
   * - 'axis': Show all series at cursor x-position (good for comparing values)
   * - 'item': Show only the hovered series (good for many series)
   * @default 'axis'
   */
  tooltipTrigger?: 'axis' | 'item';
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
  /**
   * Enable aggregate series toggle button
   * When enabled, shows a button to toggle visibility of the aggregate series
   * @default false
   */
  enableAggregateToggle?: boolean;
  /**
   * Name of the aggregate series to control with the toggle
   * @default 'Average'
   */
  aggregateSeriesName?: string;
  /**
   * Enable series filter with search (useful for many series)
   * Shows a collapsible filter UI when enabled
   * @default false
   */
  enableSeriesFilter?: boolean;
  /**
   * Display x-axis values relative to an epoch (shows 1-32 instead of absolute slot numbers)
   * When enabled, tooltips will show both absolute and relative values
   * Format: "Slot: 12907872 (1/32)"
   */
  relativeSlots?: {
    /** The epoch number to calculate relative slots from */
    epoch: number;
  };
}
