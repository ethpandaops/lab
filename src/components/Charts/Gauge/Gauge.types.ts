/**
 * Configuration for a single gauge item
 */
export interface GaugeItem {
  /**
   * Display name for the gauge
   */
  name: string;
  /**
   * Current value (numerator)
   */
  value: number;
  /**
   * Maximum value (denominator)
   */
  max: number;
  /**
   * Optional custom color (hex) for this gauge
   * Falls back to themeColors.primary if not provided
   */
  color?: string;
}

/**
 * Props for the Gauge component
 */
export interface GaugeProps {
  /**
   * Array of gauge items to display
   */
  data: GaugeItem[];
  /**
   * Height of the chart in pixels or '100%'
   * @default 300
   */
  height?: number | string;
  /**
   * Chart title
   */
  title?: string;
  /**
   * Title font size in pixels
   * @default 16
   */
  titleFontSize?: number;
  /**
   * Title font family
   */
  titleFontFamily?: string;
  /**
   * Title font weight
   * @default 600
   */
  titleFontWeight?: number;
  /**
   * Title horizontal alignment
   * @default 'center'
   */
  titleLeft?: 'left' | 'center' | 'right';
  /**
   * Title top offset in pixels
   * @default 8
   */
  titleTop?: number;
  /**
   * Animation duration in milliseconds
   * @default 800
   */
  animationDuration?: number;
  /**
   * Whether to show percentage labels
   * @default true
   */
  showPercentage?: boolean;
  /**
   * Number of decimal places for percentage
   * @default 1
   */
  percentageDecimals?: number;
  /**
   * Gauge radius as percentage of chart size
   * @default 70
   */
  radius?: number;
  /**
   * Gauge width as percentage of radius
   * @default 15
   */
  gaugeWidth?: number;
  /**
   * Control chart merging behavior
   * @default false
   */
  notMerge?: boolean;
  /**
   * Control lazy update behavior
   * @default true
   */
  lazyUpdate?: boolean;
}
