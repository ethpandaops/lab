import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlockProposalChartProps } from './BlockProposalChart.types';

/**
 * Chart showing block proposals by epoch
 *
 * Displays:
 * - Step chart with epoch numbers on x-axis (step: 'end' for count data measured at each epoch)
 * - Number of proposals on y-axis (integer-only with minInterval: 1)
 * - Supports modal popout for expanded view
 *
 * Uses step chart because this is "event count per period" data - blocks proposed per epoch
 * are discrete integer counts measured AT each epoch boundary.
 */
export function BlockProposalChart({ data }: BlockProposalChartProps): React.JSX.Element {
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

    // Build series data
    const chartData: Array<[number, number]> = sortedData.map(d => [d.epoch, d.blocksProposed]);

    const series = [
      {
        name: 'Proposals',
        data: chartData,
        showSymbol: false,
        color: themeColors.primary,
        step: 'end' as const, // Count data measured at each epoch
        showArea: true,
        areaStyle: {
          opacity: 0.3,
        },
      },
    ];

    return { series, minEpoch, maxEpoch };
  }, [data, themeColors.primary]);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard title="Proposals" subtitle="No block proposal data available">
        {() => <Alert variant="info" title="No Data" description="No block proposal data available for this entity." />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="Proposals" subtitle="Last 12h" modalSize="full" anchorId="block-proposal-chart">
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
            name: 'Blocks',
            min: 0,
            minInterval: 1, // Always prevent decimals for count data
          }}
          height={inModal ? 600 : 300}
          enableDataZoom={true}
        />
      )}
    </PopoutCard>
  );
}
