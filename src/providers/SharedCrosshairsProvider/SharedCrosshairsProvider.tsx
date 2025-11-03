import { type JSX, useCallback, useRef } from 'react';
import * as echarts from 'echarts/core';
import type { EChartsType } from 'echarts/core';
import { SharedCrosshairsContext } from '@/contexts/SharedCrosshairsContext';
import type { SyncGroup } from '@/contexts/SharedCrosshairsContext';

interface SharedCrosshairsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for managing shared crosshairs across multiple charts
 *
 * Maintains a registry of chart instances grouped by sync group ID.
 * When charts register/unregister, calls echarts.connect() to synchronize
 * tooltips and axis pointers across charts in the same group.
 *
 * @example
 * ```tsx
 * <SharedCrosshairsProvider>
 *   <App />
 * </SharedCrosshairsProvider>
 * ```
 */
export function SharedCrosshairsProvider({ children }: SharedCrosshairsProviderProps): JSX.Element {
  // Map of sync group ID to Set of chart instances
  const chartGroupsRef = useRef<Map<SyncGroup, Set<EChartsType>>>(new Map());

  /**
   * Register a chart instance to a sync group
   * Connects all charts in the group via echarts.connect()
   */
  const registerChart = useCallback((group: SyncGroup, instance: EChartsType) => {
    const groups = chartGroupsRef.current;

    // Get or create the set for this group
    if (!groups.has(group)) {
      groups.set(group, new Set());
    }

    const groupSet = groups.get(group)!;
    groupSet.add(instance);

    // Connect all charts in this group - pass the array of instances
    if (groupSet.size > 1) {
      echarts.connect(Array.from(groupSet));
    }
  }, []);

  /**
   * Unregister a chart instance from a sync group
   * Disconnects the instance and reconnects remaining charts
   */
  const unregisterChart = useCallback((group: SyncGroup, instance: EChartsType) => {
    const groups = chartGroupsRef.current;
    const groupSet = groups.get(group);

    if (!groupSet) return;

    // Remove from set
    groupSet.delete(instance);

    // If group is empty, remove it
    if (groupSet.size === 0) {
      groups.delete(group);
      return;
    }

    // Reconnect remaining charts if there are multiple
    if (groupSet.size > 1) {
      echarts.connect(Array.from(groupSet));
    }
  }, []);

  return (
    <SharedCrosshairsContext.Provider value={{ registerChart, unregisterChart }}>
      {children}
    </SharedCrosshairsContext.Provider>
  );
}
