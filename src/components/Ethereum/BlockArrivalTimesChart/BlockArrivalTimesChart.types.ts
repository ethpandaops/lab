import type { PopoutCardProps } from '@/components/Layout/PopoutCard';

/**
 * Data point for block arrival times chart
 */
export interface BlockArrivalDataPoint {
  /** X-axis value (typically slot number) */
  x: number;
  /** Minimum arrival time (ms from slot start) */
  min: number | null;
  /** 5th percentile arrival time (ms from slot start) */
  p05: number | null;
  /** Median arrival time (ms from slot start) */
  p50: number | null;
  /** 90th percentile arrival time (ms from slot start) */
  p90: number | null;
  /** Maximum arrival time (ms from slot start) */
  max: number | null;
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}

/**
 * X-axis configuration
 */
export interface XAxisConfig {
  /** X-axis name */
  name: string;
  /** Minimum x value */
  min?: number;
  /** Maximum x value */
  max?: number;
  /** Custom formatter */
  formatter?: (value: string | number) => string;
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}

/**
 * Props for BlockArrivalTimesChart component
 */
export interface BlockArrivalTimesChartProps {
  /** Array of block arrival data points */
  data: BlockArrivalDataPoint[];
  /** X-axis configuration */
  xAxis: XAxisConfig;
  /** Chart title */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Chart height in pixels */
  height?: number;
  /** Anchor ID for scroll anchor */
  anchorId?: string;
  /** Whether chart is displayed in modal */
  inModal?: boolean;
  /** Modal size */
  modalSize?: PopoutCardProps['modalSize'];
  /** Optional relative slot display config */
  relativeSlots?: { epoch: number };
  /**
   * Sync group identifier for shared crosshairs
   * Charts with the same syncGroup will have synchronized tooltips and axis pointers
   */
  syncGroup?: string;
}
