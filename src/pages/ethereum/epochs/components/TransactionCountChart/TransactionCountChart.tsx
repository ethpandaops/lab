import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { BlockProductionDataPoint } from '../../hooks';

export interface TransactionCountChartProps {
  data: BlockProductionDataPoint[];
  anchorId?: string;
}

export function TransactionCountChart({ data, anchorId }: TransactionCountChartProps): React.JSX.Element {
  const { series, minSlot, avgTxs } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minSlot: 0, avgTxs: 0 };
    }

    const minSlot = Math.min(...data.map(d => d.slot));

    const txData = data.filter(d => d.transactionCount !== null);
    const avgTxs =
      txData.length > 0 ? txData.reduce((sum, d) => sum + (d.transactionCount ?? 0), 0) / txData.length : 0;

    const series = [
      {
        name: 'Transactions',
        data: data.filter(d => d.transactionCount !== null).map(d => [d.slot, d.transactionCount] as [number, number]),
        showSymbol: false,
        smooth: true,
      },
    ];

    return { series, minSlot, avgTxs };
  }, [data]);

  return (
    <PopoutCard
      title="Transaction Count"
      subtitle={`${avgTxs.toFixed(0)} average transactions per block`}
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: 'Slot',
            min: minSlot,
          }}
          yAxis={{
            name: 'Transactions',
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
