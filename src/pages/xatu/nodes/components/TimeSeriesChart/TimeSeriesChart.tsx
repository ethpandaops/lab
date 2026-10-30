import type { JSX, ReactNode } from 'react';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useTimezone } from '@/hooks/useTimezone';
import type { Granularity } from '../../constants';
import { hoveredIndex, renderTooltip, type TooltipRow } from '../../utils/chart-tooltip';
import { bucketAxisLabel, bucketHeading } from '../../utils/time-buckets';

export interface TimeSeriesChartProps {
  title: string;
  subtitle?: string;
  anchorId: string;
  /** Bucket starts (unix seconds); every series is aligned to them */
  buckets: number[];
  granularity: Granularity;
  series: SeriesData[];
  /** Tooltip rows for the hovered bucket */
  tooltipRows: (index: number) => TooltipRow[];
  yAxisName?: string;
  yMax?: number;
  height?: number;
  syncGroup?: string;
  headerActions?: ReactNode;
  /** Shown instead of the chart when there is nothing to plot */
  empty?: string;
}

/**
 * Hourly or daily history in a popout card: a time axis labelled in the viewer's timezone and a tooltip per bucket.
 */
export function TimeSeriesChart({
  title,
  subtitle,
  anchorId,
  buckets,
  granularity,
  series,
  tooltipRows,
  yAxisName = 'ms',
  yMax,
  height = 320,
  syncGroup,
  headerActions,
  empty,
}: TimeSeriesChartProps): JSX.Element {
  const { timezone } = useTimezone();

  const tooltipFormatter = (params: unknown): string => {
    const index = hoveredIndex(params);
    if (index === null || index >= buckets.length) return '';
    const rows = tooltipRows(index);
    return renderTooltip(
      bucketHeading(buckets[index], granularity, timezone),
      rows.length > 0 ? rows : [{ label: 'No data', value: '' }]
    );
  };

  return (
    <PopoutCard title={title} subtitle={subtitle} anchorId={anchorId} modalSize="full" headerActions={headerActions}>
      {({ inModal }) =>
        empty ? (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
            {empty}
          </div>
        ) : (
          <MultiLineChart
            series={series}
            xAxis={{
              type: 'category',
              labels: buckets.map(start => bucketAxisLabel(start, granularity, buckets.length, timezone)),
            }}
            yAxis={{ name: yAxisName, min: 0, max: yMax }}
            height={inModal ? 600 : height}
            showLegend
            endLabels={false}
            connectNulls={false}
            tooltipFormatter={tooltipFormatter}
            syncGroup={inModal ? undefined : syncGroup}
          />
        )
      }
    </PopoutCard>
  );
}
