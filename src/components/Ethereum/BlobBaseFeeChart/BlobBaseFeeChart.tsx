import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlobBaseFeeChartProps } from './BlobBaseFeeChart.types';

// EIP-4844 constants for blob base fee calculation
const MIN_BLOB_BASE_FEE = 1n; // 1 wei
const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477n;

/**
 * Calculate blob base fee from excess blob gas using EIP-4844 formula
 *
 * Formula: fake_exponential(MIN_BLOB_BASE_FEE, excess_blob_gas, BLOB_BASE_FEE_UPDATE_FRACTION)
 *
 * @param excessBlobGas - Excess blob gas value
 * @returns Blob base fee in gwei, or null if no excess gas
 */
function calculateBlobBaseFee(excessBlobGas: number | null): number | null {
  if (excessBlobGas === null || excessBlobGas === 0) {
    return null;
  }

  // Fake exponential approximation from EIP-4844
  // fake_exponential(factor, numerator, denominator) returns factor * e ** (numerator / denominator)
  const factor = MIN_BLOB_BASE_FEE;
  const numerator = BigInt(excessBlobGas);
  const denominator = BLOB_BASE_FEE_UPDATE_FRACTION;

  let output = factor;
  let numeratorAccum = factor * numerator;

  for (let i = 1n; numeratorAccum > 0n; i++) {
    output += numeratorAccum / denominator;
    numeratorAccum = (numeratorAccum * numerator) / (denominator * i);
  }

  // Convert from wei to gwei for display
  return Number(output) / 1e9;
}

/**
 * BlobBaseFeeChart - Reusable chart for visualizing EIP-4844 blob base fee
 *
 * Displays blob base fee calculated from excess blob gas using the EIP-4844 formula.
 * Works with any x-axis granularity (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for blob base fee:
 * - Step chart (step: 'middle') - measurement represents the entire period
 * - Light area fill (30% opacity) with visible line for better readability
 * - Decimal values supported (gwei can be fractional)
 * - Automatic subtitle with average if not provided
 *
 * @example Slot-level granularity
 * ```tsx
 * <BlobBaseFeeChart
 *   data={slots.map(s => ({ x: s.slot, excessBlobGas: s.excessBlobGas }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Blob base fee per slot"
 * />
 * ```
 *
 * @example Epoch-level average
 * ```tsx
 * <BlobBaseFeeChart
 *   data={epochs.map(e => ({ x: e.epoch, excessBlobGas: e.avgExcessBlobGas }))}
 *   xAxis={{ name: 'Epoch' }}
 *   subtitle="Average blob base fee per epoch"
 * />
 * ```
 */
export function BlobBaseFeeChart({
  data,
  xAxis,
  title = 'Blob Base Fee',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
}: BlobBaseFeeChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  const { series, avgFee, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], avgFee: 0, minX: undefined };
    }

    // Calculate blob base fees
    const fees = data.map(d => ({
      x: d.x,
      fee: calculateBlobBaseFee(d.excessBlobGas),
    }));

    // Calculate average from non-null fees
    const nonNullFees = fees.filter(f => f.fee !== null);
    const avgFee = nonNullFees.length > 0 ? nonNullFees.reduce((sum, f) => sum + f.fee!, 0) / nonNullFees.length : 0;

    const series = [
      {
        name: 'Blob Base Fee',
        data: fees.map(f => [f.x, f.fee] as [number, number | null]),
        step: 'middle' as const,
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 2,
        showSymbol: false,
        color: themeColors.accent,
      },
    ];

    const minX = Math.min(...data.map(d => d.x));
    return { series, avgFee, minX };
  }, [data, themeColors.accent]);

  // Calculate dynamic subtitle with average if not provided
  const effectiveSubtitle = subtitle ?? `${avgFee.toFixed(3)} gwei average`;

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
            name: 'Blob Base Fee (gwei)',
            valueDecimals: 3, // Show 3 decimals for gwei precision
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
