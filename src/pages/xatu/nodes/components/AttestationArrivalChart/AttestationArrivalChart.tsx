import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface AttestationArrivalChartProps {
  history: NodeHistory;
  rangeLabel: string;
  /** Bucket starts where the node was behind the network */
  behind?: Set<number>;
}

/**
 * When the node saw each slot's attestations: the median per hour or day, inside its p10–p90.
 */
export function AttestationArrivalChart({ history, rangeLabel, behind }: AttestationArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const byBucket = rowsByBucket(history.rows);
  const aligned = history.buckets.map(start => byBucket.get(start) ?? null);
  const plotted = aligned.map((row, index) => (behind?.has(history.buckets[index]) ? null : row));

  return (
    <TimeSeriesChart
      title="Attestation arrival"
      subtitle={rangeLabel}
      anchorId="attestation-arrival"
      buckets={history.buckets}
      granularity={history.granularity}
      yMax={axisCeiling(plotted.map(row => row?.p90 ?? null))}
      behind={behind}
      empty={history.rows.length === 0 ? 'No data in this range' : undefined}
      series={[
        ...createBandSeries(
          'P10–P90',
          'attestation-band',
          plotted.map(row => row?.p10 ?? null),
          plotted.map(row => row?.p90 ?? null),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Median',
          plotted.map(row => row?.p50 ?? null),
          { color: colors.primary, lineWidth: 2 }
        ),
      ]}
      tooltipRows={index => {
        const row = aligned[index];
        if (!row) return [];
        return [
          { color: colors.primary, label: 'P90', value: formatMs(row.p90) },
          { color: colors.primary, label: 'Median', value: formatMs(row.p50) },
          { color: colors.primary, label: 'P10', value: formatMs(row.p10) },
          { label: 'Slots', value: row.count.toLocaleString() },
        ];
      }}
      syncGroup="node-history"
    />
  );
}
