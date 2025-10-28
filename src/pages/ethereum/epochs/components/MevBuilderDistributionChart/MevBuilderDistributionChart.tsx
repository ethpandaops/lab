import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils/dataVizColors';

import type { MevBuilderDistributionChartProps } from './MevBuilderDistributionChart.types';

/**
 * Chart showing MEV builder distribution across slots in an epoch
 *
 * Displays top builders by block count in the epoch
 */
export function MevBuilderDistributionChart({ data, anchorId }: MevBuilderDistributionChartProps): React.JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { builders, chartData } = useMemo(() => {
    // Count slots per builder
    const builderCounts = new Map<string, number>();
    data.forEach(d => {
      if (d.builder) {
        const shortBuilder = d.builder.slice(0, 16) + '...';
        builderCounts.set(shortBuilder, (builderCounts.get(shortBuilder) ?? 0) + 1);
      }
    });

    // Sort by count descending, top 10
    const sortedBuilders = Array.from(builderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      builders: sortedBuilders.map(([builder]) => builder),
      chartData: sortedBuilders.map(([, count], index) => ({
        value: count,
        color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      })),
    };
  }, [data, CHART_CATEGORICAL_COLORS]);

  return (
    <PopoutCard
      title="Builder Distribution"
      subtitle="Top builders by block count in epoch"
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <BarChart
          data={chartData}
          labels={builders}
          height={inModal ? 600 : 300}
          orientation="horizontal"
          axisName="Blocks"
          showLabel={false}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
