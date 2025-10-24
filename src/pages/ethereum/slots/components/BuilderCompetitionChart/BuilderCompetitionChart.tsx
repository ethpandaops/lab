import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BarChart } from '@/components/Charts/Bar';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { BuilderCompetitionChartProps, BuilderChartData } from './BuilderCompetitionChart.types';

/**
 * BuilderCompetitionChart - Visualizes MEV builder bid competition
 *
 * Shows the number of bids submitted by each builder for a specific slot
 * using a horizontal bar chart. Highlights the winning builder if available.
 *
 * @example
 * ```tsx
 * <BuilderCompetitionChart
 *   builderData={[
 *     { builder_pubkey: '0xabc...', bid_total: 12 },
 *     { builder_pubkey: '0xdef...', bid_total: 8 },
 *     ...
 *   ]}
 *   winningBuilder="0xabc..."
 * />
 * ```
 */
export function BuilderCompetitionChart({ builderData, winningBuilder }: BuilderCompetitionChartProps): JSX.Element {
  const themeColors = useThemeColors();

  /**
   * Truncate builder public key for display
   * Shows first 6 and last 4 characters: 0xabc...def1
   */
  const truncateBuilder = (pubkey: string): string => {
    if (!pubkey) return 'Unknown';
    if (pubkey.length <= 12) return pubkey;
    return `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}`;
  };

  // Process and transform builder data for chart
  const { chartData, labels, totalBids, processedData } = useMemo(() => {
    // Transform and sort data by bid count (descending)
    const processed: BuilderChartData[] = builderData
      .map(builder => ({
        name: truncateBuilder(builder.builder_pubkey || ''),
        fullPubkey: builder.builder_pubkey || 'Unknown',
        bidCount: builder.bid_total || 0,
        isWinner: winningBuilder ? builder.builder_pubkey === winningBuilder : false,
      }))
      .sort((a, b) => b.bidCount - a.bidCount);

    // Create chart data with custom colors
    const data = processed.map(builder => ({
      value: builder.bidCount,
      color: builder.isWinner ? themeColors.accent : themeColors.secondary,
    }));

    const builderNames = processed.map(d => d.name);
    const total = builderData.reduce((sum, builder) => sum + (builder.bid_total || 0), 0);

    return {
      chartData: data,
      labels: builderNames,
      totalBids: total,
      processedData: processed,
    };
  }, [builderData, winningBuilder, themeColors.accent, themeColors.secondary]);

  // Custom tooltip formatter to show full pubkey and winner badge
  const tooltipFormatter = useMemo(
    () => (params: unknown) => {
      const param = (params as { name: string; value: number; dataIndex: number }[])[0];
      const builderInfo = processedData[param.dataIndex];
      const isWinner = builderInfo?.isWinner;
      const winnerText = isWinner ? '<br/><strong>(Winner)</strong>' : '';
      return `${builderInfo?.fullPubkey}<br/>Bids: ${param.value}${winnerText}`;
    },
    [processedData]
  );

  // Handle empty data
  if (builderData.length === 0) {
    return (
      <PopoutCard title="Builder Competition" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex min-h-[500px] items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No builder bid data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${totalBids.toLocaleString()} bids • ${builderData.length} builders`;

  return (
    <PopoutCard title="Builder Competition" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <div className={inModal ? 'min-h-[500px]' : 'h-64'}>
          <BarChart
            data={chartData}
            labels={labels}
            orientation="horizontal"
            axisName="Bid Count"
            height="100%"
            animationDuration={0}
            tooltipFormatter={tooltipFormatter}
          />
        </div>
      )}
    </PopoutCard>
  );
}
