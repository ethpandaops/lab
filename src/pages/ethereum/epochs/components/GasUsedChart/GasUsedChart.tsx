import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlockProductionDataPoint } from '../../hooks';

export interface GasChartProps {
  data: BlockProductionDataPoint[];
  anchorId?: string;
}

/**
 * Chart showing gas used and gas limit across slots
 *
 * Displays both gas used and gas limit as separate series
 */
export function GasChart({ data, anchorId }: GasChartProps): React.JSX.Element {
  const colors = useThemeColors();

  const { series, minSlot, maxSlot, avgGasUsed } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minSlot: 0, maxSlot: 0, avgGasUsed: 0 };
    }

    const minSlot = Math.min(...data.map(d => d.slot));
    const maxSlot = Math.max(...data.map(d => d.slot));

    const gasUsedData = data.filter(d => d.gasUsed !== null);
    const avgGasUsed =
      gasUsedData.length > 0
        ? gasUsedData.reduce((sum, d) => sum + (d.gasUsed ?? 0), 0) / gasUsedData.length / 1000000
        : 0;

    const series = [
      {
        name: 'Gas Used',
        data: data.filter(d => d.gasUsed !== null).map(d => [d.slot, (d.gasUsed ?? 0) / 1000000] as [number, number]),
        showSymbol: false,
        smooth: true,
        color: colors.primary,
      },
      {
        name: 'Gas Limit',
        data: data.filter(d => d.gasLimit !== null).map(d => [d.slot, (d.gasLimit ?? 0) / 1000000] as [number, number]),
        showSymbol: false,
        smooth: true,
        color: colors.muted,
        lineStyle: 'dashed' as const,
      },
    ];

    return { series, minSlot, maxSlot, avgGasUsed };
  }, [data, colors.primary, colors.muted]);

  return (
    <PopoutCard
      title="Gas"
      subtitle={`${avgGasUsed.toFixed(1)}M average gas used per block`}
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
            max: maxSlot,
          }}
          yAxis={{
            name: 'Gas (M)',
          }}
          height={inModal ? 600 : 300}
          grid={{ left: 60 }}
          showLegend={true}
          enableDataZoom={true}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
