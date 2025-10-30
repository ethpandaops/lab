import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlockValueChartProps } from './BlockValueChart.types';

/**
 * BlockValueChart - Reusable chart for visualizing MEV block values
 *
 * Displays block value data (typically from MEV-boosted blocks) as a filled step chart.
 * Works with any x-axis granularity (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for MEV block value:
 * - Step chart (step: 'middle') - measurement represents the entire period
 * - Light area fill (30% opacity) with visible line for better readability
 * - Decimal values for ETH precision
 *
 * @example Slot-level granularity
 * ```tsx
 * import { weiToEth } from '@/utils/ethereum';
 *
 * <BlockValueChart
 *   data={mevSlots.map(s => ({ x: s.slot, value: weiToEth(s.blockValue) }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Block value (ETH) for MEV-boosted blocks"
 * />
 * ```
 *
 * @example Epoch-level aggregation
 * ```tsx
 * <BlockValueChart
 *   data={epochs.map(e => ({ x: e.epoch, value: e.totalBlockValue }))}
 *   xAxis={{ name: 'Epoch' }}
 *   subtitle="Total MEV block value per epoch"
 * />
 * ```
 */
export function BlockValueChart({
  data,
  xAxis,
  title = 'Block Value',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
}: BlockValueChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  const { series, avgBlockValue, totalValue, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], avgBlockValue: 0, totalValue: 0, minX: undefined };
    }

    // Only calculate average from non-zero values (MEV blocks only)
    const nonZeroValues = data.filter(d => d.value > 0);
    const avgBlockValue =
      nonZeroValues.length > 0 ? nonZeroValues.reduce((sum, d) => sum + d.value, 0) / nonZeroValues.length : 0;

    const totalValue = data.reduce((sum, d) => sum + d.value, 0);

    const series = [
      {
        name: 'Block Value',
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
    return { series, avgBlockValue, totalValue, minX };
  }, [data, themeColors.primary]);

  // Calculate dynamic subtitle with average if not provided
  const effectiveSubtitle = subtitle ?? `${avgBlockValue.toFixed(3)} ETH average (${totalValue.toFixed(2)} ETH total)`;

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
            name: 'Block Value (ETH)',
            valueDecimals: 3, // Show 3 decimals for ETH precision
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
