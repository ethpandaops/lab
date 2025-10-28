import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils/dataVizColors';

import type { BlockSizeChartProps } from './BlockSizeChart.types';

/**
 * Chart showing block sizes across slots in an epoch
 *
 * Displays consensus and execution layer sizes, both compressed and uncompressed
 */
export function BlockSizeChart({ data, anchorId }: BlockSizeChartProps): React.JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const series = useMemo(() => {
    // Convert bytes to KB for better readability
    const consensusSizeKB = data.map(d => (d.consensusSize ? d.consensusSize / 1024 : null));
    const consensusSizeCompressedKB = data.map(d =>
      d.consensusSizeCompressed ? d.consensusSizeCompressed / 1024 : null
    );
    const executionSizeKB = data.map(d => (d.executionSize ? d.executionSize / 1024 : null));
    const executionSizeCompressedKB = data.map(d =>
      d.executionSizeCompressed ? d.executionSizeCompressed / 1024 : null
    );

    return [
      {
        name: 'CL (uncompressed)',
        data: consensusSizeKB,
        color: CHART_CATEGORICAL_COLORS[0], // blue
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'dashed' as const,
      },
      {
        name: 'CL (compressed)',
        data: consensusSizeCompressedKB,
        color: CHART_CATEGORICAL_COLORS[0], // blue
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'solid' as const,
      },
      {
        name: 'EL (uncompressed)',
        data: executionSizeKB,
        color: CHART_CATEGORICAL_COLORS[1], // emerald
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'dashed' as const,
      },
      {
        name: 'EL (compressed)',
        data: executionSizeCompressedKB,
        color: CHART_CATEGORICAL_COLORS[1], // emerald
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'solid' as const,
      },
    ];
  }, [data, CHART_CATEGORICAL_COLORS]);

  const xAxisLabels = useMemo(() => data.map(d => d.slot.toString()), [data]);

  return (
    <PopoutCard
      title="Block Size"
      subtitle="Consensus and execution layer block sizes (compressed and uncompressed)"
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'category',
            labels: xAxisLabels,
          }}
          yAxis={{
            name: 'Size (KB)',
            formatter: value => value.toFixed(0),
          }}
          height={inModal ? 600 : 300}
          showLegend={true}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
