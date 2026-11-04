import { useMemo, useState, type JSX } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDayLabel } from '@/pages/ethereum/validators/utils/overview';
import { getDataVizColors } from '@/utils';

import {
  addCounts,
  EMPTY_COUNTS,
  metricById,
  metricValue,
  METRICS,
  type MetricId,
  type PerformanceCounts,
} from '../../utils/performance';

export interface PerformanceTrendProps {
  entity: string;
  /** Days of the window, oldest first */
  days: string[];
  /** The entity's counts per day */
  own: Map<string, PerformanceCounts>;
  /** Every validator's counts per day */
  network: Map<string, PerformanceCounts>;
  /** The window as text */
  window: string;
  isLoading: boolean;
}

/** Windows longer than this many days are drawn per week, so days with few proposals do not swing the lines */
const WEEKLY_AFTER_DAYS = 120;

/** Monday of a UTC day's week (YYYY-MM-DD) */
function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Sums counts into buckets */
function bucketed(
  byDay: Map<string, PerformanceCounts>,
  bucket: (day: string) => string
): Map<string, PerformanceCounts> {
  const out = new Map<string, PerformanceCounts>();
  for (const [day, counts] of byDay) out.set(bucket(day), addCounts(out.get(bucket(day)) ?? EMPTY_COUNTS, counts));
  return out;
}

/** One measure of the entity over time beside the network's, daily or weekly over long windows */
export function PerformanceTrend({
  entity,
  days,
  own,
  network,
  window,
  isLoading,
}: PerformanceTrendProps): JSX.Element {
  const [metricId, setMetricId] = useState<MetricId>('attested');
  const metric = metricById(metricId);
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
  const theme = useThemeColors();
  const weekly = days.length > WEEKLY_AFTER_DAYS;

  const { labels, series } = useMemo(() => {
    const bucket = (day: string): string => (weekly ? weekStart(day) : day);
    const buckets = [...new Set(days.map(bucket))];
    const ownBuckets = bucketed(own, bucket);
    const networkBuckets = bucketed(network, bucket);
    const values = (source: Map<string, PerformanceCounts>): (number | null)[] =>
      buckets.map(b => {
        const value = metricValue(metric, source.get(b) ?? EMPTY_COUNTS);
        return value === null ? null : Number(value.toFixed(5));
      });
    return {
      labels: buckets.map(formatDayLabel),
      series: [
        {
          name: 'Network',
          data: values(networkBuckets),
          color: theme.muted,
          lineStyle: 'dashed' as const,
          lineWidth: 1.5,
          showSymbol: false,
        },
        {
          name: entity,
          data: values(ownBuckets),
          color: CHART_CATEGORICAL_COLORS[0],
          lineWidth: 2.5,
          showSymbol: false,
        },
      ],
    };
  }, [days, own, network, metric, weekly, entity, theme.muted, CHART_CATEGORICAL_COLORS]);

  return (
    <Card
      rounded
      title="Over time"
      subtitle={`${metric.label} of ${entity} and the network, finalized chain, ${weekly ? 'weekly' : 'daily'}, ${window}`}
      actions={
        <SelectMenu
          value={metricId}
          onChange={setMetricId}
          options={METRICS.map(m => ({ value: m.id, label: m.label }))}
          expandToFit
        />
      }
      footer={
        <p className="text-xs/5 text-muted">
          Each point divides the {weekly ? "week's" : "day's"} sums, so it is weighted by{' '}
          {metric.sample === 'duties' ? 'attestation duty' : metric.sample === 'proposals' ? 'proposal' : 'MEV block'}.
          {metric.sample !== 'duties' && ` ${weekly ? 'Weeks' : 'Days'} without ${metric.sample} leave a gap.`}
        </p>
      }
    >
      {isLoading ? (
        <LoadingContainer className="h-80 rounded-sm" />
      ) : (
        <MultiLineChart
          series={series}
          xAxis={{ type: 'category', labels, name: weekly ? 'Week' : 'Date' }}
          yAxis={{ name: metric.axis, min: 'dataMin' }}
          height={320}
          showLegend
          legendPosition="top"
        />
      )}
    </Card>
  );
}
