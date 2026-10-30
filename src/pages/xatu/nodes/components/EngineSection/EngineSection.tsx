import type { JSX } from 'react';
import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import { Stats } from '@/components/DataDisplay/Stats';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { rangeValue } from '../../utils/history';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface EngineSectionProps {
  newPayload: NodeHistory;
  getBlobs: NodeHistory | null;
  rangeLabel: string;
}

/**
 * Engine API calls from the node to its execution client: headline timings and durations over time.
 */
export function EngineSection({ newPayload, getBlobs, rangeLabel }: EngineSectionProps): JSX.Element {
  const colors = useThemeColors();
  const blobsColor = getDataVizColors().CHART_CATEGORICAL_COLORS[0];
  const payloadRows = rowsByBucket(newPayload.rows);
  const blobRows = rowsByBucket(getBlobs?.rows ?? []);
  const payload = newPayload.buckets.map(start => payloadRows.get(start) ?? null);
  const blobs = newPayload.buckets.map(start => blobRows.get(start)?.p50 ?? null);

  const calls = newPayload.rows.reduce((sum, row) => sum + row.count, 0);
  const notValid = newPayload.rows.reduce((sum, row) => sum + (row.notValid ?? 0), 0);
  const requested = getBlobs?.rows.reduce((sum, row) => sum + (row.requested ?? 0), 0) ?? 0;
  const returned = getBlobs?.rows.reduce((sum, row) => sum + (row.returned ?? 0), 0) ?? 0;
  const hitRate = requested > 0 ? returned / requested : null;

  return (
    <div className="flex flex-col gap-6">
      <Stats
        gridClassName="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        stats={[
          { id: 'np-p50', name: 'newPayload p50', value: formatMs(rangeValue(newPayload.rows, 'p50')) },
          { id: 'np-p95', name: 'newPayload p95', value: formatMs(rangeValue(newPayload.rows, 'p95')) },
          {
            id: 'np-invalid',
            name: 'newPayload not VALID',
            value: notValid.toLocaleString(),
            valueClassName: notValid > 0 ? 'text-warning' : 'text-success',
            subtitle: `of ${calls.toLocaleString()} calls`,
          },
          { id: 'gb-p50', name: 'getBlobs p50', value: formatMs(getBlobs ? rangeValue(getBlobs.rows, 'p50') : null) },
          {
            id: 'gb-hit',
            name: 'getBlobs hit rate',
            value: hitRate === null ? '–' : `${(hitRate * 100).toFixed(1)}%`,
            valueClassName: hitRate === null ? undefined : hitRate < 0.9 ? 'text-warning' : 'text-success',
          },
        ]}
      />

      <TimeSeriesChart
        title="Engine API duration"
        subtitle={rangeLabel}
        anchorId="engine-duration"
        buckets={newPayload.buckets}
        granularity={newPayload.granularity}
        height={300}
        yMax={axisCeiling(payload.map(row => row?.p90 ?? null))}
        series={[
          ...createBandSeries(
            'newPayload P50–P90',
            'payload-band',
            payload.map(row => row?.p50 ?? null),
            payload.map(row => row?.p90 ?? null),
            { color: colors.primary, opacity: 0.2 }
          ),
          createStatisticSeries(
            'newPayload median',
            payload.map(row => row?.p50 ?? null),
            { color: colors.primary, lineWidth: 2 }
          ),
          createStatisticSeries('getBlobs median', blobs, { color: blobsColor }),
        ]}
        tooltipRows={index => {
          const row = payload[index];
          if (!row) return [];
          return [
            { color: colors.primary, label: 'newPayload p90', value: formatMs(row.p90) },
            { color: colors.primary, label: 'newPayload median', value: formatMs(row.p50) },
            { color: blobsColor, label: 'getBlobs median', value: formatMs(blobs[index]) },
            { label: 'Calls', value: row.count.toLocaleString() },
          ];
        }}
        syncGroup="node-history"
      />
    </div>
  );
}
