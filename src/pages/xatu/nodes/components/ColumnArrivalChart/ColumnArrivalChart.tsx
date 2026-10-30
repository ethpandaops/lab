import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface ColumnArrivalChartProps {
  history: NodeHistory;
  rangeLabel: string;
}

/**
 * When the node held all of a slot's custody columns (median inside p10–p90), and when the first arrived.
 */
export function ColumnArrivalChart({ history, rangeLabel }: ColumnArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const byBucket = rowsByBucket(history.rows);
  const aligned = history.buckets.map(start => byBucket.get(start) ?? null);

  return (
    <TimeSeriesChart
      title="Data column arrival"
      subtitle={rangeLabel}
      anchorId="column-arrival"
      buckets={history.buckets}
      granularity={history.granularity}
      height={260}
      yMax={axisCeiling(aligned.map(row => row?.p90 ?? null))}
      series={[
        ...createBandSeries(
          'Last column P10–P90',
          'column-band',
          aligned.map(row => row?.p10 ?? null),
          aligned.map(row => row?.p90 ?? null),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Last column median',
          aligned.map(row => row?.p50 ?? null),
          { color: colors.primary, lineWidth: 2 }
        ),
        createStatisticSeries(
          'First column median',
          aligned.map(row => row?.firstP50 ?? null),
          { color: colors.muted, lineStyle: 'dashed' }
        ),
      ]}
      tooltipRows={index => {
        const row = aligned[index];
        if (!row) return [];
        return [
          { color: colors.primary, label: 'Last column p90', value: formatMs(row.p90) },
          { color: colors.primary, label: 'Last column median', value: formatMs(row.p50) },
          { color: colors.muted, label: 'First column median', value: formatMs(row.firstP50) },
          { label: 'Columns', value: String(row.columns ?? '–') },
        ];
      }}
      syncGroup="node-history"
    />
  );
}
