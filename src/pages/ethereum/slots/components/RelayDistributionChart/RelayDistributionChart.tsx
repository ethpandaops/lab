import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card } from '@/components/Layout/Card';
import { useThemeColors } from '@/hooks/useThemeColors';
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

  // Process relay data and create chart options
  const chartOption = useMemo((): EChartsOption => {
    if (relayData.length === 0) {
      return {};
    }

    // Transform and sort data by bid count (descending)
    const processedData: RelayChartData[] = relayData
      .map(relay => ({
        name: relay.relay_name || 'Unknown',
        bidCount: relay.bid_total || 0,
        isWinner: winningRelay ? relay.relay_name === winningRelay : false,
      }))
      .sort((a, b) => b.bidCount - a.bidCount);

    // Extract data for chart
    const relayNames = processedData.map(d => d.name);
    const bidCounts = processedData.map(d => d.bidCount);

    // Create color array - highlight winner with primary color
    const colors = processedData.map(d => (d.isWinner ? themeColors.primary : themeColors.secondary));

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
        data: relayNames,
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
          fontSize: 11,
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
          const isWinner = processedData[param.dataIndex].isWinner;
          const winnerText = isWinner ? '<br/><strong>(Winner)</strong>' : '';
          return `${param.name}<br/>Bids: ${param.value}${winnerText}`;
        },
      },
    } as unknown as EChartsOption;
  }, [relayData, winningRelay, themeColors]);

  // Calculate total bids for header
  const totalBids = useMemo(() => {
    return relayData.reduce((sum, relay) => sum + (relay.bid_total || 0), 0);
  }, [relayData]);

  // Handle empty data
  if (relayData.length === 0) {
    return (
      <Card header={<h3 className="text-lg/7 font-semibold text-foreground">Relay Distribution</h3>}>
        <div className="flex h-64 items-center justify-center text-muted">
          <p>No relay bid data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg/7 font-semibold text-foreground">Relay Distribution</h3>
          <span className="text-sm whitespace-nowrap text-muted">
            {totalBids.toLocaleString()} bids • {relayData.length} relays
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
