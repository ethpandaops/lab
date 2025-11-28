import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils/dataVizColors';

import type { MevBuilderDistributionChartProps } from './MevBuilderDistributionChart.types';

/**
 * MevBuilderDistributionChart - Reusable chart for visualizing MEV builder distribution
 *
 * Displays top builders by block count as a horizontal bar chart. Works with any
 * granularity (epoch, slot range, time range).
 *
 * Features:
 * - Automatic aggregation and sorting of builders by count
 * - Configurable top N builders display
 * - Automatic builder name truncation
 * - Color-coded categorical visualization
 * - Responsive sizing for card and modal views
 *
 * @example Epoch-level granularity
 * ```tsx
 * <MevBuilderDistributionChart
 *   data={mevData}
 *   subtitle="Top builders by block count in epoch 12345"
 * />
 * ```
 *
 * @example Slot range
 * ```tsx
 * <MevBuilderDistributionChart
 *   data={mevData}
 *   subtitle="Top builders from slots 1000-2000"
 *   topN={5}
 * />
 * ```
 */
export function MevBuilderDistributionChart({
  data,
  title = 'Builder Distribution',
  subtitle = 'Top builders by block count',
  topN = 10,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  truncateLength = 16,
}: MevBuilderDistributionChartProps): React.JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { builders, chartData } = useMemo(() => {
    // Count blocks per builder
    const builderCounts = new Map<string, number>();
    data.forEach(d => {
      if (d.builder) {
        // Truncate builder identifier
        const shortBuilder = d.builder.length > truncateLength ? d.builder.slice(0, truncateLength) + '...' : d.builder;
        builderCounts.set(shortBuilder, (builderCounts.get(shortBuilder) ?? 0) + 1);
      }
    });

    // Sort by count descending, take top N
    const sortedBuilders = Array.from(builderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return {
      builders: sortedBuilders.map(([builder]) => builder),
      chartData: sortedBuilders.map(([, count], index) => ({
        value: count,
        color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      })),
    };
  }, [data, topN, truncateLength, CHART_CATEGORICAL_COLORS]);

  const chartHeight = height ?? (inModal ? 600 : 300);

  // If no builders found, show empty state
  if (builders.length === 0) {
    return (
      <PopoutCard title={title} subtitle={subtitle} anchorId={anchorId} modalSize={modalSize}>
        {({ inModal: isInModal }) => (
          <div
            className="flex items-center justify-center text-muted"
            style={{ height: isInModal ? 600 : chartHeight }}
          >
            No builder data available
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title={title} subtitle={subtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <BarChart
          data={chartData}
          labels={builders}
          height={isInModal ? 600 : chartHeight}
          orientation="horizontal"
          axisName="Blocks"
          showLabel={false}
        />
      )}
    </PopoutCard>
  );
}
