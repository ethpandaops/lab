import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { AttestationVolumeChartProps } from './AttestationVolumeChart.types';

/**
 * Chart showing attestation liveness over epochs
 *
 * Displays:
 * - Two series: attested (green) and missed (red)
 * - Line chart with epoch numbers on x-axis
 * - Attestation count on y-axis
 * - Supports modal popout for expanded view
 */
export function AttestationVolumeChart({ data }: AttestationVolumeChartProps): React.JSX.Element {
  // Transform data into chart format
  const { series, minEpoch, maxEpoch, totalAttested, totalMissed } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minEpoch: 0, maxEpoch: 0, totalAttested: 0, totalMissed: 0 };
    }

    // Sort by epoch
    const sortedData = [...data].sort((a, b) => a.epoch - b.epoch);
    const minEpoch = sortedData[0].epoch;
    const maxEpoch = sortedData[sortedData.length - 1].epoch;

    // Calculate totals - totalAttestations includes both attested and missed
    const totalAttested = sortedData.reduce((sum, d) => sum + (d.totalAttestations - d.missedAttestations), 0);
    const totalMissed = sortedData.reduce((sum, d) => sum + d.missedAttestations, 0);

    // Build series data
    const attestedData: Array<[number, number]> = sortedData.map(d => [
      d.epoch,
      d.totalAttestations - d.missedAttestations,
    ]);
    const missedData: Array<[number, number]> = sortedData.map(d => [d.epoch, d.missedAttestations]);

    const series = [
      {
        name: 'Attested',
        data: attestedData,
        showSymbol: false,
        color: '#10b981', // green
      },
      {
        name: 'Missed',
        data: missedData,
        showSymbol: false,
        color: '#ef4444', // red
      },
    ];

    return { series, minEpoch, maxEpoch, totalAttested, totalMissed };
  }, [data]);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard title="Attestation Liveness" subtitle="No attestation data available">
        {() => <Alert variant="info" title="No Data" description="No attestation data available for this entity." />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Attestation Liveness"
      subtitle={`${totalAttested.toLocaleString()} attested, ${totalMissed.toLocaleString()} missed across ${data.length} epochs`}
      modalSize="full"
    >
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
