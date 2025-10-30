import type { DialogSize } from '@/components/Overlays/Dialog/Dialog.types';

/**
 * Data point for BlobBaseFeeChart
 */
export interface BlobBaseFeeDataPoint {
  /** X-axis value (slot, epoch, block, or timestamp) */
  x: number;
  /** Excess blob gas used to calculate blob base fee */
  excessBlobGas: number | null;
}

/**
 * X-axis configuration
 */
export interface XAxisConfig {
  /** Axis label (e.g., 'Slot', 'Epoch', 'Block') */
  name: string;
  /** Optional minimum value */
  min?: number;
  /** Optional maximum value */
  max?: number;
  /** Optional formatter for axis labels */
  formatter?: (value: number | string) => string;
}

export interface BlobBaseFeeChartProps {
  /**
   * Array of blob base fee data points
   */
  data: BlobBaseFeeDataPoint[];

  /**
   * X-axis configuration
   */
  xAxis: XAxisConfig;

  /**
   * Optional chart title (defaults to 'Blob Base Fee')
   */
  title?: string;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Optional chart height in pixels
   */
  height?: number;

  /**
   * Optional anchor ID for linking
   */
  anchorId?: string;

  /**
   * Whether the chart is being rendered inside a modal
   * @internal Used by PopoutCard
   */
  inModal?: boolean;

  /**
   * Modal size when popped out
   */
  modalSize?: DialogSize;

  /**
   * Display x-axis values relative to an epoch (shows 1-32 instead of absolute slot numbers)
   * When enabled, tooltips will show both absolute and relative values
   */
  relativeSlots?: {
    /** The epoch number to calculate relative slots from */
    epoch: number;
  };
}
