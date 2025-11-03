import type { EChartsType } from 'echarts/core';

/**
 * Sync group identifier for grouping charts that should share crosshairs
 * Charts in the same group will have synchronized tooltips and axis pointers
 */
export type SyncGroup = string;

/**
 * Context value for managing shared crosshairs across multiple charts
 */
export interface SharedCrosshairsContextValue {
  /**
   * Register a chart instance to a sync group
   * @param group - The sync group identifier
   * @param instance - The ECharts instance to register
   */
  registerChart: (group: SyncGroup, instance: EChartsType) => void;

  /**
   * Unregister a chart instance from a sync group
   * @param group - The sync group identifier
   * @param instance - The ECharts instance to unregister
   */
  unregisterChart: (group: SyncGroup, instance: EChartsType) => void;
}
