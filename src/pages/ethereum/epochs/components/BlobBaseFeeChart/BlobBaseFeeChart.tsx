import { useMemo } from 'react';

import { LineChart } from '@/components/Charts/Line';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlobBaseFeeChartProps } from './BlobBaseFeeChart.types';

// EIP-4844 constants for blob base fee calculation
const MIN_BLOB_BASE_FEE = 1n; // 1 wei
const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477n;

/**
 * Calculate blob base fee from excess blob gas using EIP-4844 formula
 * Formula: fake_exponential(MIN_BLOB_BASE_FEE, excess_blob_gas, BLOB_BASE_FEE_UPDATE_FRACTION)
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
 * Chart showing blob base fee across slots in an epoch
 *
 * Displays calculated blob base fee from excess blob gas
 */
export function BlobBaseFeeChart({ data, anchorId }: BlobBaseFeeChartProps): React.JSX.Element {
  const colors = useThemeColors();

  const blobBaseFees = useMemo(() => data.map(d => calculateBlobBaseFee(d.excessBlobGas)), [data]);
  const labels = useMemo(() => data.map(d => d.slot.toString()), [data]);

  return (
    <PopoutCard title="Blob Base Fee" subtitle="Blob base fee across epoch slots" anchorId={anchorId} modalSize="full">
      {({ inModal }) => (
        <LineChart
          data={blobBaseFees}
          labels={labels}
          height={inModal ? 600 : 300}
          smooth={true}
          color={colors.accent}
          yAxisTitle="Blob Base Fee (gwei)"
          xAxisLabelInterval="auto"
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
