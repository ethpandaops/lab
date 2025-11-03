import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { GasUsedChartProps } from './GasUsedChart.types';

/**
 * GasUsedChart - Reusable chart for visualizing gas usage
 *
 * Displays gas used (and optionally gas limit) as a step chart. Works with any x-axis
 * granularity (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for gas measurements:
 * - Step chart (step: 'middle') - measurements taken at each point
 * - Light area fill (30% opacity) for gas used with visible line for better readability
 * - Optional dashed line for gas limit
 *
 * @example Slot-level granularity with gas limit
 * ```tsx
 * <GasUsedChart
 *   data={slots.map(s => ({
 *     x: s.slot,
 *     gasUsed: s.gasUsed,
 *     gasLimit: s.gasLimit
 *   }))}
 *   xAxis={{ name: 'Slot' }}
 * />
 * ```
 *
 * @example Epoch-level average gas usage
 * ```tsx
 * <GasUsedChart
 *   data={epochs.map(e => ({ x: e.epoch, gasUsed: e.avgGasUsed }))}
 *   xAxis={{ name: 'Epoch' }}
 *   showGasLimit={false}
 * />
 * ```
 */
export function GasUsedChart({
  data,
  xAxis,
  title = 'Gas Usage',
  subtitle,
  showGasLimit,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
}: GasUsedChartProps): React.JSX.Element {
  const { series, avgGasUsed, hasGasLimit, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], avgGasUsed: 0, hasGasLimit: false, minX: undefined };
    }

    // Check if any data points have gas limit
    const hasGasLimit = data.some(d => d.gasLimit !== undefined && d.gasLimit !== null);

    // Calculate average gas used (in millions for readability)
    const avgGasUsed = data.reduce((sum, d) => sum + d.gasUsed, 0) / data.length / 1000000;
    const minX = data.length > 0 ? Math.min(...data.map(d => d.x)) : undefined;

    const series: SeriesData[] = [
      {
        name: 'Gas Used',
        data: data.map(d => [d.x, d.gasUsed / 1000000] as [number, number]),
        step: 'middle' as const,
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 2,
        showSymbol: false,
      },
    ];

    // Add gas limit series if available and not explicitly disabled
    if (hasGasLimit && showGasLimit !== false) {
      series.push({
        name: 'Gas Limit',
        data: data
          .filter(d => d.gasLimit !== undefined && d.gasLimit !== null)
          .map(d => [d.x, (d.gasLimit ?? 0) / 1000000] as [number, number]),
        step: 'middle' as const,
        showArea: false,
        lineWidth: 2,
        lineStyle: 'dashed' as const,
        showSymbol: false,
      });
    }

    return { series, avgGasUsed, hasGasLimit, minX };
  }, [data, showGasLimit]);

  // Calculate dynamic subtitle if not provided
  const effectiveSubtitle = subtitle ?? `${avgGasUsed.toFixed(1)}M average gas used`;

  const chartHeight = height ?? (inModal ? 600 : 300);
  const shouldShowLegend = hasGasLimit && showGasLimit !== false;

  return (
    <PopoutCard title={title} subtitle={effectiveSubtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: xAxis.name,
            min: xAxis.min ?? minX,
            max: xAxis.max,
            formatter: xAxis.formatter,
          }}
          yAxis={{
            name: 'Gas (M)',
            valueDecimals: 1,
          }}
          height={isInModal ? 600 : chartHeight}
          showLegend={shouldShowLegend}
          enableDataZoom={true}
          animationDuration={300}
          relativeSlots={relativeSlots}
        />
      )}
    </PopoutCard>
  );
}
