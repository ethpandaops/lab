/**
 * Shared ECharts type definitions
 * Used across chart components for consistent typing
 */

/**
 * ECharts tooltip formatter parameter for single item
 */
export interface TooltipFormatterParam {
  /**
   * Series name
   */
  seriesName?: string;
  /**
   * Data name (category label)
   */
  name?: string;
  /**
   * Data value (can be single number or array for scatter/line charts)
   */
  value?: number | number[] | [number, number];
  /**
   * Data index in the series
   */
  dataIndex?: number;
  /**
   * Series index
   */
  seriesIndex?: number;
  /**
   * Series type (line, bar, scatter, etc.)
   */
  seriesType?: string;
  /**
   * Marker HTML for legend
   */
  marker?: string;
  /**
   * Original data object
   */
  data?: unknown;
  /**
   * Color of the series
   */
  color?: string;
  /**
   * Component type
   */
  componentType?: string;
  /**
   * Component sub type
   */
  componentSubType?: string;
}

/**
 * ECharts tooltip formatter parameters (can be single or array)
 */
export type TooltipFormatterParams = TooltipFormatterParam | TooltipFormatterParam[];

/**
 * ECharts tooltip formatter function type
 */
export type TooltipFormatter = (params: TooltipFormatterParams) => string;
