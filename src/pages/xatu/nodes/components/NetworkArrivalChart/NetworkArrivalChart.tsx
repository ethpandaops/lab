import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Granularity } from '../../constants';
import type { BucketSpread } from '../../hooks/useNetworkHistory';
import { formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface NetworkArrivalChartProps {
  buckets: number[];
  granularity: Granularity;
  /** Network rollups by bucket start */
  spread: Map<number, BucketSpread>;
  rangeLabel: string;
}

const NO_DATA: BucketSpread = { p10: null, p50: null, p90: null, nodeCount: 0 };

/**
 * Spread of block arrival across nodes over time: the p10–p90 band and median of every node's median.
 */
export function NetworkArrivalChart({
  buckets,
  granularity,
  spread,
  rangeLabel,
}: NetworkArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const byBucket = buckets.map(start => spread.get(start) ?? NO_DATA);

  return (
    <TimeSeriesChart
      title="Block arrival across node IDs"
      subtitle={`Each node ID's median, ${rangeLabel.toLowerCase()}`}
      anchorId="network-block-arrival"
      buckets={buckets}
      granularity={granularity}
      series={[
        ...createBandSeries(
          'P10–P90',
          'network-band',
          byBucket.map(bucket => bucket.p10),
          byBucket.map(bucket => bucket.p90),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Median',
          byBucket.map(bucket => bucket.p50),
          { color: colors.primary, lineWidth: 2 }
        ),
      ]}
      tooltipRows={index => {
        const bucket = byBucket[index];
        if (bucket.nodeCount === 0) return [];
        return [
          { color: colors.primary, label: 'P90', value: formatMs(bucket.p90) },
          { color: colors.primary, label: 'Median', value: formatMs(bucket.p50) },
          { color: colors.primary, label: 'P10', value: formatMs(bucket.p10) },
          { label: 'Node IDs', value: String(bucket.nodeCount) },
        ];
      }}
      syncGroup="nodes-overview"
    />
  );
}
