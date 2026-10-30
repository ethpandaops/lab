import type { JSX } from 'react';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { hoveredIndex, renderTooltip } from '../../utils/chart-tooltip';
import { histogram } from '../../utils/node-stats';

export interface ArrivalHistogramProps {
  title: string;
  subtitle?: string;
  anchorId: string;
  /** Arrival times in ms */
  values: number[];
  /** What each value counts, e.g. "Nodes" or "Slots" */
  unit: string;
  bucketMs?: number;
  /** Start of the first bucket */
  minMs?: number;
  /** Values past this land in the last bucket */
  maxMs?: number;
  /** Spacing of axis labels */
  labelEveryMs?: number;
}

/**
 * Histogram of arrival times on a slot-time axis.
 */
export function ArrivalHistogram({
  title,
  subtitle,
  anchorId,
  values,
  unit,
  bucketMs = 250,
  minMs = 0,
  maxMs = 6000,
  labelEveryMs = 1000,
}: ArrivalHistogramProps): JSX.Element {
  const colors = useThemeColors();
  const { starts, counts } = histogram(values, bucketMs, maxMs, minMs);
  const labels = starts.map(start => String(start / 1000));

  const tooltipFormatter = (params: unknown): string => {
    const index = hoveredIndex(params);
    if (index === null) return '';
    const start = starts[index];
    const isOverflow = start + bucketMs >= maxMs && values.some(value => value >= maxMs);
    const range = isOverflow
      ? `${(start / 1000).toFixed(2)}s+`
      : `${(start / 1000).toFixed(2)}–${((start + bucketMs) / 1000).toFixed(2)}s`;
    return renderTooltip(range, [{ color: colors.primary, label: unit, value: String(counts[index] ?? 0) }]);
  };

  return (
    <PopoutCard title={title} subtitle={subtitle} anchorId={anchorId} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={[{ name: unit, data: counts, color: colors.primary, seriesType: 'bar' }]}
          xAxis={{
            type: 'category',
            labels,
            formatter: value => (Math.round(Number(value) * 1000) % labelEveryMs === 0 ? `${value}s` : ''),
          }}
          yAxis={{ name: unit, min: 0, minInterval: 1 }}
          height={inModal ? 500 : 320}
          tooltipFormatter={tooltipFormatter}
        />
      )}
    </PopoutCard>
  );
}
