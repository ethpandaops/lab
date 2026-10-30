import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface AttestationArrivalChartProps {
  history: NodeHistory;
  rangeLabel: string;
}

/**
 * When the node saw each slot's attestations: the median per hour or day, inside its p10–p90.
 */
export function AttestationArrivalChart({ history, rangeLabel }: AttestationArrivalChartProps): JSX.Element {
  const colors = useThemeColors();
  const byBucket = rowsByBucket(history.rows);
  const aligned = history.buckets.map(start => byBucket.get(start) ?? null);

  return (
    <TimeSeriesChart
      title="Attestation arrival"
      subtitle={rangeLabel}
      anchorId="attestation-arrival"
      buckets={history.buckets}
      granularity={history.granularity}
      yMax={axisCeiling(aligned.map(row => row?.p90 ?? null))}
      series={[
        ...createBandSeries(
          'P10–P90',
          'attestation-band',
          aligned.map(row => row?.p10 ?? null),
          aligned.map(row => row?.p90 ?? null),
          { color: colors.primary, opacity: 0.2 }
        ),
        createStatisticSeries(
          'Median',
          aligned.map(row => row?.p50 ?? null),
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
