import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { AttestationRateChartProps } from './AttestationRateChart.types';

/**
 * Chart showing online rate percentage over epochs
 *
 * Displays:
 * - Line chart with linear interpolation (smooth: false) to show rate precision and volatility
 * - Epoch numbers on x-axis
 * - Online rate percentage (0-100) on y-axis
 * - Supports modal popout for expanded view
 */
export function AttestationRateChart({ data }: AttestationRateChartProps): React.JSX.Element {
  // Transform data into chart format
  const { series, minEpoch, maxEpoch } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minEpoch: 0, maxEpoch: 0 };
    }

    // Sort by epoch
    const sortedData = [...data].sort((a, b) => a.epoch - b.epoch);
    const minEpoch = sortedData[0].epoch;
    const maxEpoch = sortedData[sortedData.length - 1].epoch;

    // Build series data - convert rate from 0-1 to 0-100
    const chartData: Array<[number, number]> = sortedData.map(d => [d.epoch, d.rate * 100]);

    const series = [
      {
        name: 'Online Rate',
        data: chartData,
        showSymbol: false,
        smooth: false, // Linear interpolation for rate/percentage data to show precision
        color: '#10b981', // green
      },
    ];

    return { series, minEpoch, maxEpoch };
  }, [data]);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard title="Online Rate" subtitle="No attestation data available">
        {() => <Alert variant="info" title="No Data" description="No attestation data available for this entity." />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Online Rate"
      subtitle="Last 12h"
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
            name: 'Rate (%)',
            min: 0,
            max: 100,
          }}
          height={inModal ? 600 : 400}
          showLegend={false}
          enableDataZoom={true}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
