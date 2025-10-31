/**
 * Data point for gas usage timeseries
 */
export interface GasUsedDataPoint {
  /** X-axis value (slot, epoch, block, timestamp, etc.) */
  x: number;
  /** Gas used */
  gasUsed: number;
  /** Gas limit (optional) */
  gasLimit?: number;
}

/**
 * X-axis configuration for GasUsedChart
 */
export interface GasUsedXAxisConfig {
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
 * GasUsedChart component props
 */
export interface GasUsedChartProps {
  /** Timeseries data for gas usage */
  data: GasUsedDataPoint[];
  /** X-axis configuration */
  xAxis: GasUsedXAxisConfig;
  /** Chart title (defaults to "Gas Usage") */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Show gas limit line (defaults to true if data contains gasLimit) */
  showGasLimit?: boolean;
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
