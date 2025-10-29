import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { AttestationVolumeChartProps } from './AttestationVolumeChart.types';

/**
 * Chart showing attestation liveness over epochs
 *
 * Displays:
 * - Two series: attested (green) and missed (red)
 * - Step chart with epoch numbers on x-axis (step: 'end' for count data measured at each epoch)
 * - Attestation count on y-axis (integer values only)
 * - Supports modal popout for expanded view
 */
export function AttestationVolumeChart({ data }: AttestationVolumeChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  // Transform data into chart format
  const { series, minEpoch, maxEpoch } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minEpoch: 0, maxEpoch: 0 };
    }

    // Sort by epoch
    const sortedData = [...data].sort((a, b) => a.epoch - b.epoch);
    const minEpoch = sortedData[0].epoch;
    const maxEpoch = sortedData[sortedData.length - 1].epoch;

    // Build series data - plot counts by status directly
    const attestedData: Array<[number, number]> = sortedData.map(d => [d.epoch, d.totalAttestations]);
    const missedData: Array<[number, number]> = sortedData.map(d => [d.epoch, d.missedAttestations]);

    const series = [
      {
        name: 'Attested',
        data: attestedData,
        showSymbol: false,
        color: themeColors.success,
        step: 'end' as const, // Count data measured at each epoch
      },
      {
        name: 'Missed',
        data: missedData,
        showSymbol: false,
        color: themeColors.danger,
        step: 'end' as const, // Count data measured at each epoch
      },
    ];

    return { series, minEpoch, maxEpoch };
  }, [data, themeColors.success, themeColors.danger]);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard title="Attestation Liveness" subtitle="No attestation data available">
        {() => <Alert variant="info" title="No Data" description="No attestation data available for this entity." />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="Attestation Liveness" subtitle="Last 12h" modalSize="full">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: 'Epoch',
            min: minEpoch,
            max: maxEpoch,
          }}
          yAxis={{
            name: 'Count',
            minInterval: 1, // Integer-only values for count data
          }}
          height={inModal ? 600 : 400}
          showLegend={true}
          enableDataZoom={true}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
