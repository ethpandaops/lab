import type { JSX, ReactNode } from 'react';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';
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
  /** Bucket starts where the node was behind the network; shaded, and the series should leave them out */
  behind?: Set<number>;
}

/** Index ranges of consecutive buckets in `starts`, inclusive */
function runs(buckets: number[], starts: Set<number>): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  buckets.forEach((start, index) => {
    if (!starts.has(start)) return;
    const last = result[result.length - 1];
    if (last && last[1] === index - 1) last[1] = index;
    else result.push([index, index]);
  });
  return result;
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
  behind,
}: TimeSeriesChartProps): JSX.Element {
  const { timezone } = useTimezone();
  const colors = useThemeColors();
  const markAreas = behind
    ? runs(buckets, behind).map(([first, last]) => ({
        // Category axes take indexes and shade from band centre to band centre, so reach into the next bucket
        xStart: first,
        xEnd: Math.min(last + 1, buckets.length - 1),
        color: colors.warning,
        opacity: 0.12,
      }))
    : undefined;

  const tooltipFormatter = (params: unknown): string => {
    const index = hoveredIndex(params);
    if (index === null || index >= buckets.length) return '';
    const rows = [
      ...(behind?.has(buckets[index])
        ? [{ color: colors.warning, label: 'Behind the network, catching up', value: '' }]
        : []),
      ...tooltipRows(index),
    ];
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
            markAreas={markAreas}
          />
        )
      }
    </PopoutCard>
  );
}
