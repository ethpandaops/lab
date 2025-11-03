/**
 * Data point for blob count timeseries
 */
export interface BlobCountDataPoint {
  /** X-axis value (slot, epoch, timestamp, etc.) */
  x: number;
  /** Number of blobs */
  value: number;
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}

/**
 * X-axis configuration for BlobCountChart
 */
export interface BlobCountXAxisConfig {
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
 * BlobCountChart component props
 */
export interface BlobCountChartProps {
  /** Timeseries data for blob counts */
  data: BlobCountDataPoint[];
  /** X-axis configuration */
  xAxis: BlobCountXAxisConfig;
  /** Chart title (defaults to "Blob Count") */
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
