/**
 * Data point for block size timeseries
 */
export interface BlockSizeDataPoint {
  /** X-axis value (slot, epoch, timestamp, etc.) */
  x: number;
  /** Consensus layer block size in bytes (uncompressed) */
  consensusSize: number | null;
  /** Consensus layer block size in bytes (compressed) */
  consensusSizeCompressed: number | null;
  /** Execution layer block size in bytes (uncompressed) */
  executionSize: number | null;
  /** Execution layer block size in bytes (compressed) */
  executionSizeCompressed: number | null;
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}

/**
 * X-axis configuration for BlockSizeChart
 */
export interface BlockSizeXAxisConfig {
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
 * BlockSizeChart component props
 */
export interface BlockSizeChartProps {
  /** Timeseries data for block sizes */
  data: BlockSizeDataPoint[];
  /** X-axis configuration */
  xAxis: BlockSizeXAxisConfig;
  /** Chart title (defaults to "Block Size") */
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
