import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { BlockProposalChartProps } from './BlockProposalChart.types';

/**
 * Chart showing block proposals by epoch
 *
 * Displays:
 * - Line chart with epoch numbers on x-axis
 * - Number of proposals on y-axis
 * - Supports modal popout for expanded view
 */
export function BlockProposalChart({ data }: BlockProposalChartProps): React.JSX.Element {
  // Transform data into chart format
  const { series, minEpoch, maxEpoch, totalBlocks } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minEpoch: 0, maxEpoch: 0, totalBlocks: 0 };
    }

    // Sort by epoch
    const sortedData = [...data].sort((a, b) => a.epoch - b.epoch);
    const minEpoch = sortedData[0].epoch;
    const maxEpoch = sortedData[sortedData.length - 1].epoch;

    // Calculate total blocks
    const totalBlocks = sortedData.reduce((sum, d) => sum + d.blocksProposed, 0);

    // Build series data
    const chartData: Array<[number, number]> = sortedData.map(d => [d.epoch, d.blocksProposed]);

    const series = [
      {
        name: 'Proposals',
        data: chartData,
        showSymbol: false,
        color: '#3b82f6', // blue
      },
    ];

    return { series, minEpoch, maxEpoch, totalBlocks };
  }, [data]);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard title="Proposals" subtitle="No block proposal data available">
        {() => <Alert variant="info" title="No Data" description="No block proposal data available for this entity." />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Proposals"
      subtitle={`${totalBlocks.toLocaleString()} total proposals across ${data.length} epochs`}
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
            name: 'Blocks',
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
