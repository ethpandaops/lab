import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { TransactionCountChartProps } from './TransactionCountChart.types';

/**
 * TransactionCountChart - Reusable chart for visualizing transaction counts
 *
 * Displays transaction count data as a filled step chart. Works with any x-axis
 * granularity (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for count data:
 * - Step chart (step: 'middle') - count represents the entire measurement period
 * - Light area fill (30% opacity) with visible line for better readability
 * - Integer-only y-axis ticks
 * - No decimals in tooltips
 *
 * @example Slot-level granularity
 * ```tsx
 * <TransactionCountChart
 *   data={slots.map(s => ({ x: s.slot, value: s.txCount }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Transactions per slot"
 * />
 * ```
 *
 * @example Epoch-level granularity
 * ```tsx
 * <TransactionCountChart
 *   data={epochs.map(e => ({ x: e.epoch, value: e.totalTxs }))}
 *   xAxis={{ name: 'Epoch' }}
 *   subtitle="Total transactions per epoch"
 * />
 * ```
 */
export function TransactionCountChart({
  data,
  xAxis,
  title = 'Transaction Count',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
}: TransactionCountChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  const { series, avgTxs, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], avgTxs: 0, minX: undefined };
    }

    const avgTxs = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    const series = [
      {
        name: 'Transactions',
        data: data.map(d => [d.x, d.value] as [number, number]),
        step: 'middle' as const,
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 2,
        showSymbol: false,
        color: themeColors.primary,
      },
    ];

    const minX = data.length > 0 ? Math.min(...data.map(d => d.x)) : undefined;
    return { series, avgTxs, minX };
  }, [data, themeColors.primary]);

  // Calculate dynamic subtitle with average if not provided
  const effectiveSubtitle = subtitle ?? `${avgTxs.toFixed(0)} average transactions`;

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
            name: 'Transactions',
            minInterval: 1, // Integer ticks only
            valueDecimals: 0, // No decimals in tooltips
          }}
          height={isInModal ? 600 : chartHeight}
          grid={{ left: 60 }}
          showLegend={false}
          enableDataZoom={true}
          animationDuration={300}
          relativeSlots={relativeSlots}
        />
      )}
    </PopoutCard>
  );
}
