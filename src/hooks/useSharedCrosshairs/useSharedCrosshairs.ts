import { useContext, useCallback } from 'react';
import type ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsInstance } from 'echarts-for-react/lib';
import { SharedCrosshairsContext } from '@/contexts/SharedCrosshairsContext';

/**
 * Hook to register a chart for shared crosshair synchronization
 *
 * Returns a callback ref that should be passed to the ReactEChartsCore component.
 * When the chart mounts, it will automatically register for crosshair synchronization.
 *
 * @param params - Configuration object with syncGroup
 *
 * @example
 * ```tsx
 * function MyChart({ syncGroup }: { syncGroup?: string }) {
 *   const chartRef = useSharedCrosshairs({ syncGroup });
 *
 *   return <ReactEChartsCore ref={chartRef} ... />;
 * }
 * ```
 */
export function useSharedCrosshairs({ syncGroup }: { syncGroup?: string }): (node: ReactEChartsCore | null) => void {
  const context = useContext(SharedCrosshairsContext);

  const chartRef = useCallback(
    (node: ReactEChartsCore | null) => {
      if (!syncGroup || !context) return;

      if (node) {
        // Chart mounted - get instance and register
        const chartInstance = node.getEchartsInstance();
        if (chartInstance) {
          const instance = chartInstance as EChartsInstance;
          context.registerChart(syncGroup, instance);
        }
      } else {
        // Chart unmounting - we don't have access to the instance anymore
        // The provider will handle cleanup
      }
    },
    [syncGroup, context]
  );

  return chartRef;
}
