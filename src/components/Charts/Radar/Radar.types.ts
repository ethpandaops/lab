/**
 * A single data series for the radar chart
 */
export interface RadarSeries {
  /** Series name (displayed in legend) */
  name: string;
  /** Values for each indicator - must match indicators array length */
  values: number[];
  /** Optional color override for this series */
  color?: string;
  /** Optional area opacity (0-1) for filled polygon */
  areaOpacity?: number;
}

/**
 * Configuration for a radar chart indicator (axis/dimension)
 */
export interface RadarIndicator {
  /** Display name for this indicator */
  name: string;
  /** Maximum value for this axis (for scaling) */
  max: number;
  /** Optional minimum value (defaults to 0) */
  min?: number;
}

export interface RadarChartProps {
  /**
   * Data series to display (each series is one polygon)
   */
  series: RadarSeries[];

  /**
   * Radar indicators/axes configuration
   */
  indicators: RadarIndicator[];

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
   */
  titleFontFamily?: string;

  /**
   * Title font weight
   * @default 600
   */
  titleFontWeight?: number;

  /**
   * Title left position
   * @default 'center'
   */
  titleLeft?: number | string;

  /**
   * Title top position
   * @default 8
   */
  titleTop?: number;

  /**
   * Height of the chart in pixels or percentage
   * @default 400
   */
  height?: number | string;

  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;

  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean;

  /**
   * Legend position
   * @default 'bottom'
   */
  legendPosition?: 'top' | 'bottom';

  /**
   * Radar chart shape
   * @default 'polygon'
   */
  shape?: 'polygon' | 'circle';

  /**
   * Radar chart radius as percentage
   * @default 65
   */
  radius?: number;

  /**
   * Line width for series
   * @default 2
   */
  lineWidth?: number;

  /**
   * Show symbol points on vertices
   * @default false
   */
  showSymbol?: boolean;

  /**
   * Symbol size when shown
   * @default 6
   */
  symbolSize?: number;

  /**
   * Custom color palette override
   */
  colorPalette?: string[];
}
