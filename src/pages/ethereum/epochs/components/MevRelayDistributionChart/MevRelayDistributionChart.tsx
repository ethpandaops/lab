import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { CHART_CATEGORICAL_COLORS } from '@/theme/data-visualization-colors';

import type { MevRelayDistributionChartProps } from './MevRelayDistributionChart.types';

/**
 * Chart showing MEV relay distribution across slots in an epoch
 *
 * Displays top relays by block count as a horizontal bar chart
 */
export function MevRelayDistributionChart({ data, anchorId }: MevRelayDistributionChartProps): React.JSX.Element {
  const { relays, chartData } = useMemo(() => {
    // Count slots per relay
    const relayCounts = new Map<string, number>();
    data.forEach(d => {
      if (d.relay) {
        relayCounts.set(d.relay, (relayCounts.get(d.relay) ?? 0) + 1);
      }
    });

    // Sort by count descending, top 10
    const sortedRelays = Array.from(relayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      relays: sortedRelays.map(([relay]) => relay),
      chartData: sortedRelays.map(([, count], index) => ({
        value: count,
        color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      })),
    };
  }, [data]);

  return (
    <PopoutCard
      title="Relay Distribution"
      subtitle="Top relays by block count in epoch"
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <BarChart
          data={chartData}
          labels={relays}
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
