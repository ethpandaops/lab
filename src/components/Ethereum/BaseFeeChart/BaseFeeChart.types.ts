/**
 * Data point for base fee timeseries
 */
export interface BaseFeeDataPoint {
  /** X-axis value (slot, epoch, block, timestamp, etc.) */
  x: number;
  /** Base fee in Gwei */
  value: number;
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}

/**
 * X-axis configuration for BaseFeeChart
 */
export interface BaseFeeXAxisConfig {
  /** Axis label (e.g., "Slot", "Epoch", "Block Number") */
  name: string;
  /** Optional minimum value */
  min?: number;
  /** Optional maximum value */
  max?: number;
  /** Optional formatter for axis labels */
  formatter?: (value: number | string) => string;
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}

/**
 * BaseFeeChart component props
 */
export interface BaseFeeChartProps {
  /** Timeseries data for base fee */
  data: BaseFeeDataPoint[];
  /** X-axis configuration */
  xAxis: BaseFeeXAxisConfig;
  /** Chart title (defaults to "Base Fee") */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Chart height in pixels */
  height?: number;
  /** Anchor ID for deep linking */
  anchorId?: string;
  /** Whether chart is displayed in modal (affects sizing) */
  inModal?: boolean;
  /** Modal size when using PopoutCard */
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * Display x-axis values relative to an epoch (shows 1-32 instead of absolute slot numbers)
   * When enabled, tooltips will show both absolute and relative values
   */
  relativeSlots?: {
    /** The epoch number to calculate relative slots from */
    epoch: number;
  };
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}
