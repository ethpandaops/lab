import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { BlockProductionDataPoint } from '../../hooks';

export interface BaseFeeChartProps {
  data: BlockProductionDataPoint[];
  anchorId?: string;
}

export function BaseFeeChart({ data, anchorId }: BaseFeeChartProps): React.JSX.Element {
  const { series, minSlot, avgBaseFee } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minSlot: 0, avgBaseFee: 0 };
    }

    const minSlot = Math.min(...data.map(d => d.slot));

    const feeData = data.filter(d => d.baseFeePerGas !== null);
    const avgBaseFee =
      feeData.length > 0 ? feeData.reduce((sum, d) => sum + (d.baseFeePerGas ?? 0), 0) / feeData.length : 0;

    const series = [
      {
        name: 'Base Fee',
        data: data.filter(d => d.baseFeePerGas !== null).map(d => [d.slot, d.baseFeePerGas] as [number, number]),
        showSymbol: false,
        smooth: true,
      },
    ];

    return { series, minSlot, avgBaseFee };
  }, [data]);

  return (
    <PopoutCard
      title="Base Fee"
      subtitle={`${avgBaseFee.toFixed(2)} Gwei average base fee`}
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
            name: 'Base Fee (Gwei)',
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
