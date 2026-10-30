import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { NodeHistory } from '../../hooks/useNodeHistory';
import { spreadByBucket } from '../../utils/history';
import { formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface NetworkArrivalChartProps {
  /** Block rollups of every node */
  history: NodeHistory;
  rangeLabel: string;
}

/**
 * Spread of block arrival across nodes over time: the p10–p90 band and median of every node's median.
 */
export function NetworkArrivalChart({ history, rangeLabel }: NetworkArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const spread = spreadByBucket(history.rows, history.buckets);

  return (
    <TimeSeriesChart
      title="Block arrival across nodes"
      subtitle={`Each node's median, ${rangeLabel.toLowerCase()}`}
      anchorId="network-block-arrival"
      buckets={history.buckets}
      granularity={history.granularity}
      series={[
        ...createBandSeries(
          'P10–P90',
          'network-band',
          spread.map(bucket => bucket.p10),
          spread.map(bucket => bucket.p90),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Median',
          spread.map(bucket => bucket.p50),
          { color: colors.primary, lineWidth: 2 }
        ),
      ]}
      tooltipRows={index => {
        const bucket = spread[index];
        if (bucket.nodeCount === 0) return [];
        return [
          { color: colors.primary, label: 'P90', value: formatMs(bucket.p90) },
          { color: colors.primary, label: 'Median', value: formatMs(bucket.p50) },
          { color: colors.primary, label: 'P10', value: formatMs(bucket.p10) },
          { label: 'Nodes', value: String(bucket.nodeCount) },
        ];
      }}
      syncGroup="nodes-overview"
    />
  );
}
