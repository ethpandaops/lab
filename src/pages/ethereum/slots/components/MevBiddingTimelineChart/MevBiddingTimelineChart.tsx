import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import type { LineSeries, ScatterSeries } from '@/components/Charts/ScatterAndLine/ScatterAndLine.types';
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

  // Process data into line and scatter series for chart
  const { lineSeries, scatterSeries, maxValue } = useMemo(() => {
    if (biddingData.length === 0) {
      return { lineSeries: [], scatterSeries: [], maxValue: 0 };
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
    const builderSeriesData: BuilderSeries[] = Array.from(builderMap.entries()).map(([pubkey, data]) => {
      const isWinner = winningBuilder === pubkey;
      return {
        builderPubkey: pubkey,
        displayName: truncatePubkey(pubkey),
        color: generateBuilderColor(pubkey, isWinner, themeColors),
        data,
        isWinner,
      };
    });

    // Sort series so winner is rendered on top
    builderSeriesData.sort((a, b) => {
      if (a.isWinner) return 1;
      if (b.isWinner) return -1;
      return 0;
    });

    // Calculate max value for y-axis
    let max = 0;
    builderSeriesData.forEach(s => {
      s.data.forEach(point => {
        if (point.value > max) max = point.value;
      });
    });

    // If we have a winning value, ensure it's included in max
    if (winningMevValue) {
      const winningEth = weiToEth(winningMevValue);
      if (winningEth > max) max = winningEth;
    }

    // Convert to LineSeries format
    const lines: LineSeries[] = builderSeriesData.map(builder => ({
      name: builder.displayName,
      data: builder.data.map(point => [point.time, point.value] as [number, number]),
      color: builder.color,
      smooth: false,
      symbol: 'circle',
      symbolSize: builder.isWinner ? 6 : 4,
      lineWidth: builder.isWinner ? 3 : 2,
      z: builder.isWinner ? 10 : 1,
      legendIcon: builder.isWinner ? 'diamond' : undefined,
    }));

    // Create scatter series for winning bid marker (if we have one)
    const scatter: ScatterSeries[] = [];
    if (winningMevValue && winningBuilder) {
      // Find the actual winning bid time by looking at the latest bid from the winning builder
      const winningBuilderBids = biddingData.filter(bid => bid.builder_pubkey === winningBuilder);
      if (winningBuilderBids.length > 0) {
        const latestBid = winningBuilderBids.reduce((latest, current) => {
          return current.chunk_slot_start_diff > latest.chunk_slot_start_diff ? current : latest;
        });
        const winningEth = weiToEth(winningMevValue);
        scatter.push({
          name: 'Winning Bid',
          data: [[latestBid.chunk_slot_start_diff, winningEth]],
          symbol: 'diamond',
          symbolSize: 12,
          color: themeColors.success,
          borderColor: themeColors.foreground,
          borderWidth: 2,
          z: 100,
        });
      }
    }

    return {
      lineSeries: lines,
      scatterSeries: scatter,
      maxValue: max,
    };
  }, [biddingData, winningBuilder, winningMevValue, themeColors]);

  // Custom tooltip formatter
  const tooltipFormatter = useMemo(
    () => (params: unknown) => {
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
    []
  );

  // Custom X-axis formatter
  const xAxisFormatter = useMemo(
    () => (value: number) => {
      const seconds = value / 1000;
      return seconds >= 0 ? `+${seconds.toFixed(1)}s` : `${seconds.toFixed(1)}s`;
    },
    []
  );

  // Custom Y-axis formatter
  const yAxisFormatter = useMemo(() => (value: number) => value.toFixed(3), []);

  // Handle empty data
  if (biddingData.length === 0) {
    return (
      <PopoutCard title="MEV Bidding Timeline" modalSize="full">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
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
        <div className={inModal ? 'h-96' : 'h-72'}>
          <ScatterAndLineChart
            lineSeries={lineSeries}
            scatterSeries={scatterSeries}
            xAxisTitle="Time (seconds)"
            yAxisTitle="MEV Value (ETH)"
            xMin={-8000}
            xMax={4000}
            xInterval={2000}
            yMax={maxValue > 0 ? maxValue * 1.1 : 10}
            xAxisFormatter={xAxisFormatter}
            yAxisFormatter={yAxisFormatter}
            tooltipFormatter={tooltipFormatter}
            tooltipTrigger="axis"
            showLegend={true}
            legendType="scroll"
            legendPosition="bottom"
            animation={true}
            animationDuration={150}
            height="100%"
            notMerge={false}
            lazyUpdate={true}
          />
        </div>
      )}
    </PopoutCard>
  );
}
