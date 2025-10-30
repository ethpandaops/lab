/**
 * Data point for block value timeseries
 */
export interface BlockValueDataPoint {
  /** X-axis value (slot, epoch, block, timestamp, etc.) */
  x: number;
  /** Block value in ETH */
  value: number;
}

/**
 * X-axis configuration for BlockValueChart
 */
export interface BlockValueXAxisConfig {
  /** Axis label (e.g., "Slot", "Epoch", "Block Number") */
  name: string;
  /** Optional minimum value */
  min?: number;
  /** Optional maximum value */
  max?: number;
  /** Optional formatter for axis labels */
  formatter?: (value: number | string) => string;
}

/**
 * BlockValueChart component props
 */
export interface BlockValueChartProps {
  /** Timeseries data for block values */
  data: BlockValueDataPoint[];
  /** X-axis configuration */
  xAxis: BlockValueXAxisConfig;
  /** Chart title (defaults to "Block Value") */
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
}
