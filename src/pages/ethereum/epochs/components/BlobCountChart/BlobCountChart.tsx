import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { BlockProductionDataPoint } from '../../hooks';

export interface BlobCountChartProps {
  data: BlockProductionDataPoint[];
  anchorId?: string;
}

export function BlobCountChart({ data, anchorId }: BlobCountChartProps): React.JSX.Element {
  const { series, minSlot, totalBlobs } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minSlot: 0, totalBlobs: 0 };
    }

    const minSlot = Math.min(...data.map(d => d.slot));
    const totalBlobs = data.reduce((sum, d) => sum + d.blobCount, 0);

    const series = [
      {
        name: 'Blob Count',
        data: data.map(d => [d.slot, d.blobCount] as [number, number]),
        showSymbol: false,
        step: 'end' as const,
      },
    ];

    return { series, minSlot, totalBlobs };
  }, [data]);

  return (
    <PopoutCard title="Blob Count" subtitle={`${totalBlobs} total blobs in epoch`} anchorId={anchorId} modalSize="full">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: 'Slot',
            min: minSlot,
          }}
          yAxis={{
            name: 'Blobs',
          }}
          height={inModal ? 600 : 300}
          grid={{ left: 60 }}
          showLegend={false}
          enableDataZoom={true}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
