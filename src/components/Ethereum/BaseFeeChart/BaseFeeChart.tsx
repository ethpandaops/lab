import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { BaseFeeChartProps } from './BaseFeeChart.types';

/**
 * BaseFeeChart - Reusable chart for visualizing base fee (EIP-1559)
 *
 * Displays base fee data as a filled step chart. Works with any x-axis
 * granularity (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for base fee:
 * - Step chart (step: 'middle') - measurement represents the entire period
 * - Light area fill (30% opacity) with visible line for better readability
 * - Decimal values supported (Gwei can be fractional)
 *
 * @example Slot-level granularity
 * ```tsx
 * <BaseFeeChart
 *   data={slots.map(s => ({ x: s.slot, value: s.baseFeePerGas }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Base fee per slot"
 * />
 * ```
 *
 * @example Epoch-level average
 * ```tsx
 * <BaseFeeChart
 *   data={epochs.map(e => ({ x: e.epoch, value: e.avgBaseFee }))}
 *   xAxis={{ name: 'Epoch' }}
 *   subtitle="Average base fee per epoch"
 * />
 * ```
 */
export function BaseFeeChart({
  data,
  xAxis,
  title = 'Base Fee',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
  syncGroup,
}: BaseFeeChartProps): React.JSX.Element {
  const { series, avgBaseFee, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], avgBaseFee: 0, minX: undefined };
    }

    const avgBaseFee = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    const series = [
      {
        name: 'Base Fee',
        data: data.map(d => [d.x, d.value] as [number, number]),
        step: 'middle' as const, // Measurement represents the entire period
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 2,
        showSymbol: false,
      },
    ];

    const minX = data.length > 0 ? Math.min(...data.map(d => d.x)) : undefined;
    return { series, avgBaseFee, minX };
  }, [data]);

  // Calculate dynamic subtitle with average if not provided
  const effectiveSubtitle = subtitle ?? `${avgBaseFee.toFixed(2)} Gwei average base fee`;

  const chartHeight = height ?? (inModal ? 600 : 300);

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
            name: 'Base Fee (Gwei)',
            valueDecimals: 2, // Show decimals for Gwei
          }}
          height={isInModal ? 600 : chartHeight}
          enableDataZoom={true}
          relativeSlots={relativeSlots}
          syncGroup={syncGroup}
        />
      )}
    </PopoutCard>
  );
}
