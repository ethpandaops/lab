import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface NodeArrivalChartProps {
  block: NodeHistory;
  head: NodeHistory | null;
  rangeLabel: string;
}

/**
 * When the node first saw blocks (median inside its p10–p90) and head events, per hour or day.
 */
export function NodeArrivalChart({ block, head, rangeLabel }: NodeArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const headColor = getDataVizColors().CHART_CATEGORICAL_COLORS[0];
  const blockRows = rowsByBucket(block.rows);
  const headRows = rowsByBucket(head?.rows ?? []);
  const aligned = block.buckets.map(start => blockRows.get(start) ?? null);
  const headP50 = block.buckets.map(start => headRows.get(start)?.p50 ?? null);

  return (
    <TimeSeriesChart
      title="Block and head arrival"
      subtitle={rangeLabel}
      anchorId="block-head-arrival"
      buckets={block.buckets}
      granularity={block.granularity}
      yMax={axisCeiling([...aligned.map(row => row?.p90 ?? null), ...headP50])}
      series={[
        ...createBandSeries(
          'Block P10–P90',
          'block-band',
          aligned.map(row => row?.p10 ?? null),
          aligned.map(row => row?.p90 ?? null),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Block median',
          aligned.map(row => row?.p50 ?? null),
          { color: colors.primary, lineWidth: 2 }
        ),
        createStatisticSeries('Head median', headP50, { color: headColor }),
      ]}
      tooltipRows={index => {
        const row = aligned[index];
        if (!row) return [];
        return [
          { color: colors.primary, label: 'Block p90', value: formatMs(row.p90) },
          { color: colors.primary, label: 'Block median', value: formatMs(row.p50) },
          { color: colors.primary, label: 'Block p10', value: formatMs(row.p10) },
          { color: headColor, label: 'Head median', value: formatMs(headP50[index]) },
          { label: 'Slots', value: row.count.toLocaleString() },
        ];
      }}
      syncGroup="node-history"
    />
  );
}
