import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { dayStart } from '@/pages/ethereum/network/utils/network-census';

export interface SeriesCardProps {
  title: string;
  /** Days on the x axis, oldest first */
  days: string[];
  series: SeriesData[];
  /** Name of the value axis */
  yName: string;
  /** Values are percentages; a stacked share runs to 100 */
  percent?: 'stack' | 'line';
  /** What the card shows when no day has data */
  empty: string;
}

/**
 * A daily series over the range in a card, with the days it covers as its subtitle.
 */
export function SeriesCard({ title, days, series, yName, percent, empty }: SeriesCardProps): JSX.Element {
  const firstDay = days[0];
  const lastDay = days.at(-1);
  return (
    <Card
      rounded
      title={title}
      subtitle={
        firstDay !== undefined && lastDay !== undefined
          ? `Each day, ${formatDataDate(dayStart(firstDay))} to ${formatDataDate(dayStart(lastDay))}`
          : undefined
      }
    >
      {days.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <MultiLineChart
          series={series}
          xAxis={{ type: 'category', labels: days.map(formatDailyDate), name: 'Date' }}
          yAxis={
            percent
              ? {
                  name: yName,
                  min: 0,
                  max: percent === 'stack' ? 100 : undefined,
                  formatter: value => `${value}%`,
                  valueDecimals: 1,
                }
              : { name: yName, min: 0 }
          }
          height={280}
          showLegend
          legendPosition="top"
        />
      )}
    </Card>
  );
}
