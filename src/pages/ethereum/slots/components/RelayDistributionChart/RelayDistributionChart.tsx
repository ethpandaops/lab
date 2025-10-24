import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BarChart } from '@/components/Charts/Bar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CHART_CATEGORICAL_COLORS } from '@/theme/data-visualization-colors';
import type { RelayDistributionChartProps, RelayChartData } from './RelayDistributionChart.types';

/**
 * RelayDistributionChart - Visualizes MEV relay bid distribution
 *
 * Shows the number of bids received from each relay for a specific slot
 * using a horizontal bar chart. Highlights the winning relay if available.
 *
 * @example
 * ```tsx
 * <RelayDistributionChart
 *   relayData={[
 *     { relay_name: 'Flashbots', bid_total: 25 },
 *     { relay_name: 'BloXroute', bid_total: 18 },
 *     ...
 *   ]}
 *   winningRelay="Flashbots"
 * />
 * ```
 */
export function RelayDistributionChart({ relayData, winningRelay }: RelayDistributionChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process and transform relay data for chart
  const { chartData, labels, totalBids, processedData } = useMemo(() => {
    // Transform and sort data by bid count (descending)
    const processed: RelayChartData[] = relayData
      .map(relay => ({
        name: relay.relay_name || 'Unknown',
        bidCount: relay.bid_total || 0,
        isWinner: winningRelay ? relay.relay_name === winningRelay : false,
      }))
      .sort((a, b) => b.bidCount - a.bidCount);

    // Create chart data with custom colors from categorical palette
    const data = processed.map((relay, index) => ({
      value: relay.bidCount,
      color: relay.isWinner ? themeColors.primary : CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
    }));

    const relayNames = processed.map(d => d.name);
    const total = relayData.reduce((sum, relay) => sum + (relay.bid_total || 0), 0);

    return {
      chartData: data,
      labels: relayNames,
      totalBids: total,
      processedData: processed,
    };
  }, [relayData, winningRelay, themeColors.primary]);

  // Custom tooltip formatter to show winner badge
  const tooltipFormatter = useMemo(
    () => (params: unknown) => {
      const param = (params as { name: string; value: number; data: { value: number }; dataIndex: number }[])[0];
      const isWinner = processedData[param.dataIndex]?.isWinner;
      const winnerText = isWinner ? '<br/><strong>(Winner)</strong>' : '';
      // Handle both direct value and data.value formats
      const value = typeof param.value === 'number' ? param.value : (param.data?.value ?? 0);
      return `${param.name}<br/>Bids: ${value}${winnerText}`;
    },
    [processedData]
  );

  // Handle empty data
  if (relayData.length === 0) {
    return (
      <PopoutCard title="Relay Distribution" anchorId="relay-distribution" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No relay bid data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${totalBids.toLocaleString()} bids • ${relayData.length} relays`;

  return (
    <PopoutCard title="Relay Distribution" anchorId="relay-distribution" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <div className={inModal ? 'h-96' : 'h-64'}>
          <BarChart
            data={chartData}
            labels={labels}
            orientation="horizontal"
            axisName="Bid Count"
            height="100%"
            animationDuration={0}
            tooltipFormatter={tooltipFormatter}
            showLabel={false}
          />
        </div>
      )}
    </PopoutCard>
  );
}
