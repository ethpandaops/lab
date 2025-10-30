import type { DialogSize } from '@/components/Overlays/Dialog/Dialog.types';

/**
 * Data point for TopEntitiesChart
 */
export interface EntityMetricDataPoint {
  /** X-axis value (slot, epoch, block, or timestamp) */
  x: number;
  /** Entity identifier (validator name, pool name, etc.) */
  entity: string;
  /** Metric value for this entity at this point */
  count: number;
}

/**
 * X-axis configuration
 */
export interface XAxisConfig {
  /** Axis label (e.g., 'Slot', 'Epoch', 'Block') */
  name: string;
  /** Optional minimum value (if not provided, calculated from data) */
  min?: number;
  /** Optional maximum value (if not provided, calculated from data) */
  max?: number;
  /** Optional formatter for axis labels */
  formatter?: (value: number | string) => string;
}

/**
 * Y-axis configuration
 */
export interface YAxisConfig {
  /** Axis label (e.g., 'Missed Attestations', 'Count') */
  name: string;
}

export interface TopEntitiesChartProps {
  /**
   * Array of entity metric data points
   */
  data: EntityMetricDataPoint[];

  /**
   * X-axis configuration
   */
  xAxis: XAxisConfig;

  /**
   * Y-axis configuration
   */
  yAxis: YAxisConfig;

  /**
   * Number of top entities to display (default: 10)
   */
  topN?: number;

  /**
   * Optional chart title
   */
  title?: string;

  /**
   * Optional subtitle/description (auto-generated if not provided)
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
   * Message to display when no data is available
   */
  emptyMessage?: string;

  /**
   * Display x-axis values relative to an epoch (shows 1-32 instead of absolute slot numbers)
   * When enabled, tooltips will show both absolute and relative values
   */
  relativeSlots?: {
    /** The epoch number to calculate relative slots from */
    epoch: number;
  };
}
