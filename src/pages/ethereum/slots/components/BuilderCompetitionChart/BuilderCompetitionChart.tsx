import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card } from '@/components/Layout/Card';
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

  // Process builder data and create chart options
  const chartOption = useMemo((): EChartsOption => {
    if (builderData.length === 0) {
      return {};
    }

    // Transform and sort data by bid count (descending)
    const processedData: BuilderChartData[] = builderData
      .map(builder => ({
        name: truncateBuilder(builder.builder_pubkey || ''),
        fullPubkey: builder.builder_pubkey || 'Unknown',
        bidCount: builder.bid_total || 0,
        isWinner: winningBuilder ? builder.builder_pubkey === winningBuilder : false,
      }))
      .sort((a, b) => b.bidCount - a.bidCount);

    // Extract data for chart
    const builderNames = processedData.map(d => d.name);
    const bidCounts = processedData.map(d => d.bidCount);

    // Create color array - highlight winner with accent color
    const colors = processedData.map(d => (d.isWinner ? themeColors.accent : themeColors.secondary));

    return {
      animation: false,
      grid: {
        top: 20,
        right: 80,
        bottom: 40,
        left: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'value' as const,
        name: 'Bid Count',
        nameLocation: 'middle' as const,
        nameGap: 25,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 11,
        },
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 10,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: themeColors.border,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
      },
      yAxis: {
        type: 'category' as const,
        data: builderNames,
        axisLine: {
          show: true,
          lineStyle: {
            color: themeColors.border,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: themeColors.foreground,
          fontSize: 10,
          fontFamily: 'monospace',
        },
      },
      series: [
        {
          name: 'Bid Count',
          type: 'bar' as const,
          data: bidCounts.map((value, index) => ({
            value,
            itemStyle: {
              color: colors[index],
            },
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'right' as const,
            color: themeColors.foreground,
            fontSize: 11,
            formatter: '{c}',
          },
        },
      ],
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const,
        },
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { name: string; value: number; dataIndex: number }[]) => {
          const param = params[0];
          const builderInfo = processedData[param.dataIndex];
          const isWinner = builderInfo.isWinner;
          const winnerText = isWinner ? '<br/><strong>(Winner)</strong>' : '';
          return `${builderInfo.fullPubkey}<br/>Bids: ${param.value}${winnerText}`;
        },
      },
    } as unknown as EChartsOption;
  }, [builderData, winningBuilder, themeColors]);

  // Calculate total bids for header
  const totalBids = useMemo(() => {
    return builderData.reduce((sum, builder) => sum + (builder.bid_total || 0), 0);
  }, [builderData]);

  // Handle empty data
  if (builderData.length === 0) {
    return (
      <Card header={<h3 className="text-lg/7 font-semibold text-foreground">Builder Competition</h3>}>
        <div className="flex h-64 items-center justify-center text-muted">
          <p>No builder bid data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg/7 font-semibold text-foreground">Builder Competition</h3>
          <span className="text-sm whitespace-nowrap text-muted">
            {totalBids.toLocaleString()} bids • {builderData.length} builders
          </span>
        </div>
      }
    >
      <div className="h-64">
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </Card>
  );
}
