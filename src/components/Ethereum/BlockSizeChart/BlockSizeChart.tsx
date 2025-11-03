import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils/dataVizColors';

import type { BlockSizeChartProps } from './BlockSizeChart.types';

/**
 * BlockSizeChart - Reusable chart for visualizing block sizes
 *
 * Displays consensus and execution layer block sizes, both compressed and
 * uncompressed, as smooth line charts. Works with any x-axis granularity
 * (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for size data:
 * - Smooth curves for continuous measurements
 * - Solid lines for compressed, dashed for uncompressed
 * - Color-coded: CL (blue) vs EL (emerald)
 * - Converts bytes to KB for readability
 *
 * @example Slot-level granularity
 * ```tsx
 * <BlockSizeChart
 *   data={slots.map(s => ({
 *     x: s.slot,
 *     consensusSize: s.consensusSize,
 *     consensusSizeCompressed: s.consensusSizeCompressed,
 *     executionSize: s.executionSize,
 *     executionSizeCompressed: s.executionSizeCompressed
 *   }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Block sizes per slot"
 * />
 * ```
 *
 * @example Epoch-level granularity
 * ```tsx
 * <BlockSizeChart
 *   data={epochs.map(e => ({
 *     x: e.epoch,
 *     consensusSize: e.avgConsensusSize,
 *     consensusSizeCompressed: e.avgConsensusSizeCompressed,
 *     executionSize: e.avgExecutionSize,
 *     executionSizeCompressed: e.avgExecutionSizeCompressed
 *   }))}
 *   xAxis={{ name: 'Epoch' }}
 *   subtitle="Average block sizes per epoch"
 * />
 * ```
 */
export function BlockSizeChart({
  data,
  xAxis,
  title = 'Block Size',
  subtitle = 'Consensus and execution layer block sizes (compressed and uncompressed)',
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
  syncGroup,
}: BlockSizeChartProps): React.JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minX: undefined };
    }

    const minX = Math.min(...data.map(d => d.x));

    // Convert bytes to KB for better readability
    // Keep all data points, use null for missing values to maintain x-axis alignment across all series
    const series = [
      {
        name: 'CL (uncompressed)',
        data: data.map(d => [d.x, d.consensusSize !== null ? d.consensusSize / 1024 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[0], // blue
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'dashed' as const,
      },
      {
        name: 'CL (compressed)',
        data: data.map(
          d =>
            [d.x, d.consensusSizeCompressed !== null ? d.consensusSizeCompressed / 1024 : null] as [
              number,
              number | null,
            ]
        ),
        color: CHART_CATEGORICAL_COLORS[0], // blue
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'solid' as const,
      },
      {
        name: 'EL (uncompressed)',
        data: data.map(d => [d.x, d.executionSize !== null ? d.executionSize / 1024 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[1], // emerald
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'dashed' as const,
      },
      {
        name: 'EL (compressed)',
        data: data.map(
          d =>
            [d.x, d.executionSizeCompressed !== null ? d.executionSizeCompressed / 1024 : null] as [
              number,
              number | null,
            ]
        ),
        color: CHART_CATEGORICAL_COLORS[1], // emerald
        smooth: true,
        showSymbol: false,
        lineWidth: 2,
        lineStyle: 'solid' as const,
      },
    ];

    return { series, minX };
  }, [data, CHART_CATEGORICAL_COLORS]);

  const chartHeight = height ?? (inModal ? 600 : 300);

  return (
    <PopoutCard title={title} subtitle={subtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: xAxis.name,
            min: xAxis.min ?? minX,
            max: xAxis.max,
            formatter: xAxis.formatter,
          }}
          yAxis={{
            name: 'Size (KB)',
            formatter: value => value.toFixed(0),
          }}
          height={isInModal ? 600 : chartHeight}
          showLegend={true}
          enableDataZoom={true}
          animationDuration={300}
          relativeSlots={relativeSlots}
          syncGroup={syncGroup}
        />
      )}
    </PopoutCard>
  );
}
