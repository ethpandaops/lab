import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BarChart } from '@/components/Charts/Bar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { truncateAddress } from '@/utils/ethereum';
import { getDataVizColors } from '@/utils/dataVizColors';
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
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  // Process and transform builder data for chart
  const { chartData, labels, processedData } = useMemo(() => {
    // Transform and sort data by bid count (descending)
    const processed: BuilderChartData[] = builderData
      .map(builder => ({
        name: truncateAddress(builder.builder_pubkey || ''),
        fullPubkey: builder.builder_pubkey || 'Unknown',
        bidCount: builder.bid_total || 0,
        isWinner: winningBuilder ? builder.builder_pubkey === winningBuilder : false,
      }))
      .sort((a, b) => b.bidCount - a.bidCount);

    // Create chart data with custom colors from categorical palette
    const data = processed.map((builder, index) => ({
      value: builder.bidCount,
      color: builder.isWinner ? themeColors.accent : CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
    }));

    const builderNames = processed.map(d => d.name);

    return {
      chartData: data,
      labels: builderNames,
      processedData: processed,
    };
  }, [builderData, winningBuilder, themeColors.accent, CHART_CATEGORICAL_COLORS]);

  // Custom tooltip formatter to show full pubkey and winner badge
  const tooltipFormatter = useMemo(
    () => (params: unknown) => {
      const param = (params as { name: string; value: number; data: { value: number }; dataIndex: number }[])[0];
      const builderInfo = processedData[param.dataIndex];
      const isWinner = builderInfo?.isWinner;
      const winnerText = isWinner ? '<br/><strong>(Winner)</strong>' : '';
      // Handle both direct value and data.value formats
      const value = typeof param.value === 'number' ? param.value : (param.data?.value ?? 0);
      return `${builderInfo?.fullPubkey}<br/>Bids: ${value}${winnerText}`;
    },
    [processedData]
  );

  // Handle empty data
  if (builderData.length === 0) {
    return (
      <PopoutCard title="Builder Competition" anchorId="builder-competition" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No builder bid data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${builderData.length} builders`;

  return (
    <PopoutCard title="Builder Competition" anchorId="builder-competition" subtitle={subtitle} modalSize="xl">
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
