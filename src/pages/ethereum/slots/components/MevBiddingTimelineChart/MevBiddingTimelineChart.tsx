import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MevBiddingTimelineChartProps, BuilderSeries } from './MevBiddingTimelineChart.types';

/**
 * Convert wei string to ETH number
 * @param weiString - Value in wei as string
 * @returns Value in ETH as number
 */
function weiToEth(weiString: string): number {
  try {
    const wei = BigInt(weiString);
    const eth = Number(wei) / 1e18;
    return eth;
  } catch {
    return 0;
  }
}

/**
 * Truncate a public key for display
 * @param pubkey - Full public key
 * @returns Truncated pubkey (first 8 chars...last 6 chars)
 */
function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 14) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-6)}`;
}

/**
 * Generate a consistent color for a builder pubkey
 * Uses a simple hash function to generate colors
 */
function generateBuilderColor(
  pubkey: string,
  isWinner: boolean,
  themeColors: ReturnType<typeof useThemeColors>
): string {
  if (isWinner) {
    return themeColors.success;
  }

  // Generate a color based on pubkey hash
  let hash = 0;
  for (let i = 0; i < pubkey.length; i++) {
    hash = pubkey.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with good saturation and lightness
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * MevBiddingTimelineChart - Visualizes MEV bid evolution before and during the slot
 *
 * Shows how MEV bids from different builders evolved from 8 seconds before slot start
 * to 4 seconds after, with each builder represented as a separate line series.
 * Highlights the winning bid.
 *
 * Timeline: -8s to +4s (relative to slot start at 0s)
 *
 * @example
 * ```tsx
 * <MevBiddingTimelineChart
 *   biddingData={[
 *     {
 *       chunk_slot_start_diff: -2000, // 2s before slot start
 *       value: "1000000000000000000", // 1 ETH in wei
 *       builder_pubkey: "0xabc...",
 *       relay_names: ["Flashbots"],
 *     },
 *     ...
 *   ]}
 *   winningMevValue="1500000000000000000"
 *   winningBuilder="0xdef..."
 * />
 * ```
 */
export function MevBiddingTimelineChart({
  biddingData,
  winningMevValue,
  winningBuilder,
}: MevBiddingTimelineChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process data into builder series
  const { builderSeries, maxValue, winningBidTime } = useMemo(() => {
    if (biddingData.length === 0) {
      return { builderSeries: [], maxValue: 0, winningBidTime: null };
    }

    // Group bids by builder
    const builderMap = new Map<string, Array<{ time: number; value: number }>>();

    biddingData.forEach(bid => {
      const ethValue = weiToEth(bid.value);
      const timeMs = bid.chunk_slot_start_diff;

      if (!builderMap.has(bid.builder_pubkey)) {
        builderMap.set(bid.builder_pubkey, []);
      }

      builderMap.get(bid.builder_pubkey)!.push({
        time: timeMs,
        value: ethValue,
      });
    });

    // Sort data points by time for each builder
    builderMap.forEach(points => {
      points.sort((a, b) => a.time - b.time);
    });

    // Create series for each builder
    const series: BuilderSeries[] = Array.from(builderMap.entries()).map(([pubkey, data]) => {
      const isWinner = winningBuilder === pubkey;
      return {
        builderPubkey: pubkey,
        displayName: truncatePubkey(pubkey),
        color: generateBuilderColor(pubkey, isWinner, themeColors),
        data,
        isWinner,
      };
    });

    // Sort series so winner is on top
    series.sort((a, b) => {
      if (a.isWinner) return 1;
      if (b.isWinner) return -1;
      return 0;
    });

    // Calculate max value for y-axis
    let max = 0;
    series.forEach(s => {
      s.data.forEach(point => {
        if (point.value > max) max = point.value;
      });
    });

    // If we have a winning value, ensure it's included in max
    if (winningMevValue) {
      const winningEth = weiToEth(winningMevValue);
      if (winningEth > max) max = winningEth;
    }

    // Find the actual winning bid time by looking at the latest bid from the winning builder
    let actualWinningBidTime: number | null = null;
    if (winningBuilder) {
      const winningBuilderBids = biddingData.filter(bid => bid.builder_pubkey === winningBuilder);
      if (winningBuilderBids.length > 0) {
        // Get the latest bid time from the winning builder
        const latestBid = winningBuilderBids.reduce((latest, current) => {
          return current.chunk_slot_start_diff > latest.chunk_slot_start_diff ? current : latest;
        });
        actualWinningBidTime = latestBid.chunk_slot_start_diff;
      }
    }

    return {
      builderSeries: series,
      maxValue: max,
      winningBidTime: actualWinningBidTime,
    };
  }, [biddingData, winningBuilder, winningMevValue, themeColors]);

  // Prepare ECharts option
  const chartOption = useMemo(() => {
    const winningEth = winningMevValue ? weiToEth(winningMevValue) : null;

    return {
      animation: true,
      animationDuration: 150,
      grid: {
        top: 20,
        right: 24,
        bottom: 48,
        left: 64,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Time (seconds)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 12,
        },
        min: -8000,
        max: 4000,
        interval: 2000,
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
          formatter: (value: number) => {
            const seconds = value / 1000;
            return seconds >= 0 ? `+${seconds.toFixed(1)}s` : `${seconds.toFixed(1)}s`;
          },
        },
        axisLine: {
          lineStyle: {
            color: themeColors.border,
          },
        },
        splitLine: {
          lineStyle: {
            color: themeColors.border,
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'MEV Value (ETH)',
        nameLocation: 'middle',
        nameGap: 48,
        nameTextStyle: {
          color: themeColors.muted,
          fontSize: 12,
        },
        max: maxValue > 0 ? maxValue * 1.1 : 10,
        axisLabel: {
          color: themeColors.muted,
          fontSize: 12,
          formatter: (value: number) => value.toFixed(3),
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: themeColors.border,
            type: 'dashed',
          },
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const timeMs = (params[0] as { value: [number, number] }).value[0];
          const timeSec = timeMs / 1000;
          const timeDisplay = timeSec >= 0 ? `+${timeSec.toFixed(2)}s` : `${timeSec.toFixed(2)}s`;

          let tooltip = `<div style="font-weight: 600; margin-bottom: 8px;">Time: ${timeDisplay}</div>`;

          params.forEach((param: unknown) => {
            const typedParam = param as {
              value: [number, number];
              marker: string;
              seriesName: string;
            };
            const ethValue = typedParam.value[1].toFixed(4);
            const marker = typedParam.marker;
            const seriesName = typedParam.seriesName;
            tooltip += `<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              ${marker}
              <span>${seriesName}: ${ethValue} ETH</span>
            </div>`;
          });

          return tooltip;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 8,
        left: 'center',
        textStyle: {
          color: themeColors.foreground,
          fontSize: 11,
        },
        pageTextStyle: {
          color: themeColors.muted,
        },
        data: builderSeries.map(s => ({
          name: s.displayName,
          icon: s.isWinner ? 'diamond' : 'circle',
        })),
      },
      series: [
        // Builder bid lines
        ...builderSeries.map(builder => ({
          name: builder.displayName,
          type: 'line',
          data: builder.data.map(point => [point.time, point.value]),
          smooth: false,
          connectNulls: false,
          symbol: 'circle',
          symbolSize: builder.isWinner ? 6 : 4,
          lineStyle: {
            color: builder.color,
            width: builder.isWinner ? 3 : 2,
            type: builder.isWinner ? 'solid' : 'solid',
          },
          itemStyle: {
            color: builder.color,
          },
          emphasis: {
            lineStyle: {
              width: builder.isWinner ? 4 : 3,
            },
          },
          z: builder.isWinner ? 10 : 1,
        })),
        // Winning bid marker (if we have one)
        ...(winningEth !== null && winningBuilder && winningBidTime !== null
          ? [
              {
                name: 'Winning Bid',
                type: 'scatter',
                data: [[winningBidTime, winningEth]], // Show at actual winning bid time
                symbol: 'diamond',
                symbolSize: 12,
                itemStyle: {
                  color: themeColors.success,
                  borderColor: themeColors.foreground,
                  borderWidth: 2,
                },
                z: 100,
              },
            ]
          : []),
      ],
    };
  }, [builderSeries, maxValue, winningMevValue, winningBuilder, winningBidTime, themeColors]);

  // Handle empty data
  if (biddingData.length === 0) {
    return (
      <PopoutCard title="MEV Bidding Timeline" modalSize="full">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex min-h-[700px] items-center justify-center text-muted'
                : 'flex h-80 items-center justify-center text-muted'
            }
          >
            <p>No MEV bidding data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  // Format subtitle with just the winning value
  const winningValueDisplay = winningMevValue ? `${weiToEth(winningMevValue).toFixed(4)} ETH` : null;
  const subtitle = winningValueDisplay || undefined;

  return (
    <PopoutCard title="MEV Bidding Timeline" subtitle={subtitle} modalSize="full">
      {({ inModal }) => (
        <div className={inModal ? 'min-h-[700px]' : 'h-72'}>
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={false}
            lazyUpdate={true}
          />
        </div>
      )}
    </PopoutCard>
  );
}
