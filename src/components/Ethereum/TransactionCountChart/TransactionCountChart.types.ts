/**
 * Data point for transaction count timeseries
 */
export interface TransactionCountDataPoint {
  /** X-axis value (slot, epoch, block, timestamp, etc.) */
  x: number;
  /** Number of transactions */
  value: number;
}

/**
 * X-axis configuration for TransactionCountChart
 */
export interface TransactionCountXAxisConfig {
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
 * TransactionCountChart component props
 */
export interface TransactionCountChartProps {
  /** Timeseries data for transaction counts */
  data: TransactionCountDataPoint[];
  /** X-axis configuration */
  xAxis: TransactionCountXAxisConfig;
  /** Chart title (defaults to "Transaction Count") */
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
