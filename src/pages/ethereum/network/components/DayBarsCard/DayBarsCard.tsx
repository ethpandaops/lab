import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { dayStart } from '../../utils/network-census';

export interface DayBarsCardProps {
  title: string;
  /** The day the bars count */
  day: string | null;
  /** One label per bar, e.g. a subnet or column index */
  labels: string[];
  /** Name of the category axis */
  xName: string;
  /** Layers stacked into each bar */
  bars: Array<{ name: string; data: number[]; color: string }>;
  yName: string;
  /** What the card shows when the day has no bar */
  empty: string;
  /** Span both columns of a two-column grid */
  wide?: boolean;
}

/**
 * Stacked bars over the items of one day, such as every subnet or column, with that day as its subtitle.
 */
export function DayBarsCard({
  title,
  day,
  labels,
  xName,
  bars,
  yName,
  empty,
  wide = false,
}: DayBarsCardProps): JSX.Element {
  const series: SeriesData[] = bars.map(bar => ({
    name: bar.name,
    data: bar.data,
    color: bar.color,
    stack: 'bars',
    seriesType: 'bar',
  }));

  return (
    <div className={clsx(wide && 'xl:col-span-2')}>
      <Card rounded title={title} subtitle={day ? `On ${formatDataDate(dayStart(day))}` : undefined}>
        {labels.length === 0 ? (
          <p className="text-sm text-muted">{empty}</p>
        ) : (
          <MultiLineChart
            series={series}
            xAxis={{ type: 'category', labels, name: xName }}
            yAxis={{ name: yName, min: 0 }}
            height={280}
            showLegend
            legendPosition="top"
          />
        )}
      </Card>
    </div>
  );
}
