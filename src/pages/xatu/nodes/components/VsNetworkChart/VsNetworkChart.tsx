import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { spreadByBucket } from '../../utils/history';
import { formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface VsNetworkChartProps {
  nodeId: string;
  /** Block rollups of every node over the same range */
  network: NodeHistory;
  rangeLabel: string;
}

/**
 * The node's median block arrival against the spread of every node's median, per hour or day.
 */
export function VsNetworkChart({ nodeId, network, rangeLabel }: VsNetworkChartProps): JSX.Element {
  const colors = useThemeColors();
  const spread = spreadByBucket(network.rows, network.buckets);
  const own = rowsByBucket(network.rows, nodeId);
  const ownP50 = network.buckets.map(start => own.get(start)?.p50 ?? null);

  return (
    <TimeSeriesChart
      title="Block arrival vs network"
      subtitle={rangeLabel}
      anchorId="vs-network"
      buckets={network.buckets}
      granularity={network.granularity}
      series={[
        ...createBandSeries(
          'Network P10–P90',
          'vs-network-band',
          spread.map(bucket => bucket.p10),
          spread.map(bucket => bucket.p90),
          { color: colors.muted, opacity: 0.25 }
        ),
        createStatisticSeries(
          'Network median',
          spread.map(bucket => bucket.p50),
          { color: colors.muted, lineStyle: 'dashed' }
        ),
        createStatisticSeries('This node', ownP50, { color: colors.primary, lineWidth: 2 }),
      ]}
      tooltipRows={index => {
        const bucket = spread[index];
        const value = ownP50[index];
        const delta = value !== null && bucket.p50 !== null ? value - bucket.p50 : null;
        return [
          { color: colors.primary, label: 'This node', value: formatMs(value) },
          { color: colors.muted, label: 'Network median', value: formatMs(bucket.p50) },
          {
            color: colors.muted,
            label: 'Network P10–P90',
            value: `${formatMs(bucket.p10)} – ${formatMs(bucket.p90)}`,
          },
          ...(delta === null ? [] : [{ label: 'vs median', value: `${delta > 0 ? '+' : ''}${formatMs(delta)}` }]),
        ];
      }}
      syncGroup="node-history"
    />
  );
}
