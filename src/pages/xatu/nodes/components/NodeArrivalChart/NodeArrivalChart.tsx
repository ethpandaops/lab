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
  /** Bucket starts where the node was behind the network */
  behind?: Set<number>;
}

/**
 * When the node first saw blocks (median inside its p10–p90) and head events, per hour or day.
 */
export function NodeArrivalChart({ block, head, rangeLabel, behind }: NodeArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const headColor = getDataVizColors().CHART_CATEGORICAL_COLORS[0];
  const blockRows = rowsByBucket(block.rows);
  const headRows = rowsByBucket(head?.rows ?? []);
  const aligned = block.buckets.map(start => blockRows.get(start) ?? null);
  const headP50 = block.buckets.map(start => headRows.get(start)?.p50 ?? null);
  // Hours spent catching up are shaded instead of plotted, so they don't flatten the rest
  const plotted = aligned.map((row, index) => (behind?.has(block.buckets[index]) ? null : row));
  const plottedHead = headP50.map((value, index) => (behind?.has(block.buckets[index]) ? null : value));

  return (
    <TimeSeriesChart
      title="Block and head arrival"
      subtitle={rangeLabel}
      anchorId="block-head-arrival"
      buckets={block.buckets}
      granularity={block.granularity}
      yMax={axisCeiling([...plotted.map(row => row?.p90 ?? null), ...plottedHead])}
      behind={behind}
      empty={block.rows.length === 0 ? 'No data in this range' : undefined}
      series={[
        ...createBandSeries(
          'Block P10–P90',
          'block-band',
          plotted.map(row => row?.p10 ?? null),
          plotted.map(row => row?.p90 ?? null),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Block median',
          plotted.map(row => row?.p50 ?? null),
          { color: colors.primary, lineWidth: 2 }
        ),
        createStatisticSeries('Head median', plottedHead, { color: headColor }),
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
