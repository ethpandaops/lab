import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlobCountChartProps } from './BlobCountChart.types';

/**
 * BlobCountChart - Reusable chart for visualizing blob counts
 *
 * Displays blob count data as a filled step chart. Works with any x-axis
 * granularity (slot, epoch, block, timestamp).
 *
 * Automatically applies correct visualization rules for count data:
 * - Step chart (step: 'middle') - count represents the entire measurement period
 * - Light area fill (30% opacity) with visible line for better readability
 * - Integer-only y-axis ticks
 * - No decimals in tooltips
 *
 * @example Slot-level granularity
 * ```tsx
 * <BlobCountChart
 *   data={slots.map(s => ({ x: s.slot, value: s.blobCount }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Blobs per slot"
 * />
 * ```
 *
 * @example Epoch-level granularity
 * ```tsx
 * <BlobCountChart
 *   data={epochs.map(e => ({ x: e.epoch, value: e.totalBlobs }))}
 *   xAxis={{ name: 'Epoch' }}
 *   subtitle="Total blobs per epoch"
 * />
 * ```
 */
export function BlobCountChart({
  data,
  xAxis,
  title = 'Blob Count',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
}: BlobCountChartProps): React.JSX.Element {
  const themeColors = useThemeColors();

  const { series, totalBlobs, minX } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], totalBlobs: 0, minX: undefined };
    }

    const totalBlobs = data.reduce((sum, d) => sum + d.value, 0);
    const minX = Math.min(...data.map(d => d.x));

    const series = [
      {
        name: 'Blobs',
        data: data.map(d => [d.x, d.value] as [number, number]),
        step: 'middle' as const,
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 2,
        showSymbol: false,
        color: themeColors.primary,
      },
    ];

    return { series, totalBlobs, minX };
  }, [data, themeColors.primary]);

  // Calculate dynamic subtitle with total if not provided
  const effectiveSubtitle = subtitle ?? `${totalBlobs.toLocaleString()} total blobs`;

  const chartHeight = height ?? (inModal ? 600 : 300);

  return (
    <PopoutCard title={title} subtitle={effectiveSubtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: xAxis.name,
            min: xAxis.min ?? minX,
            max: xAxis.max,
            formatter: xAxis.formatter,
          }}
          yAxis={{
            name: 'Blobs',
            minInterval: 1, // Integer ticks only
            valueDecimals: 0, // No decimals in tooltips
          }}
          height={isInModal ? 600 : chartHeight}
          grid={{ left: 60 }}
          showLegend={false}
          enableDataZoom={true}
          animationDuration={300}
          relativeSlots={relativeSlots}
        />
      )}
    </PopoutCard>
  );
}
