import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils/dataVizColors';

import type { MevRelayDistributionChartProps } from './MevRelayDistributionChart.types';

/**
 * MevRelayDistributionChart - Reusable chart for MEV relay distribution
 *
 * Displays the distribution of MEV relays across blocks/slots/proposals as a
 * horizontal bar chart showing the top N relays by count. Works with any
 * granularity level.
 *
 * Features:
 * - Counts occurrences of each relay in the dataset
 * - Shows top N relays by count (default: 10)
 * - Automatically filters out null/undefined relays (non-MEV blocks)
 * - Uses categorical colors for visual distinction
 * - Horizontal orientation for better label readability
 *
 * @example Slot-level data (epoch)
 * ```tsx
 * <MevRelayDistributionChart
 *   data={slots.map(s => ({ relay: s.relay }))}
 *   countAxisName="Blocks"
 *   subtitle="Top relays by block count in epoch"
 * />
 * ```
 *
 * @example Epoch-level aggregation
 * ```tsx
 * <MevRelayDistributionChart
 *   data={epochs.flatMap(e => e.slots.map(s => ({ relay: s.relay })))}
 *   countAxisName="Blocks"
 *   topN={15}
 *   subtitle="Top relays across all epochs"
 * />
 * ```
 *
 * @example Daily aggregation
 * ```tsx
 * <MevRelayDistributionChart
 *   data={dailyBlocks.map(b => ({ relay: b.relay }))}
 *   countAxisName="Proposals"
 *   subtitle="Top relays by daily proposals"
 * />
 * ```
 */
export function MevRelayDistributionChart({
  data,
  countAxisName = 'Blocks',
  topN = 10,
  title = 'Relay Distribution',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
}: MevRelayDistributionChartProps): React.JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { relays, chartData, totalCount } = useMemo(() => {
    // Count occurrences per relay (skip null/undefined)
    const relayCounts = new Map<string, number>();
    let totalCount = 0;

    data.forEach(d => {
      if (d.relay) {
        relayCounts.set(d.relay, (relayCounts.get(d.relay) ?? 0) + 1);
        totalCount++;
      }
    });

    // Sort by count descending, take top N
    const sortedRelays = Array.from(relayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return {
      relays: sortedRelays.map(([relay]) => relay),
      chartData: sortedRelays.map(([, count], index) => ({
        value: count,
        color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      })),
      totalCount,
    };
  }, [data, topN, CHART_CATEGORICAL_COLORS]);

  // Auto-generate subtitle if not provided
  const effectiveSubtitle =
    subtitle ??
    `Top ${Math.min(topN, relays.length)} relays by count (${totalCount} total ${countAxisName.toLowerCase()})`;

  const chartHeight = height ?? (inModal ? 600 : 300);

  return (
    <PopoutCard title={title} subtitle={effectiveSubtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <BarChart
          data={chartData}
          labels={relays}
          height={isInModal ? 600 : chartHeight}
          orientation="horizontal"
          axisName={countAxisName}
          showLabel={false}
        />
      )}
    </PopoutCard>
  );
}
