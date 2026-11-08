import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { dayStart } from '../../utils/network-census';

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
  return (
    <Card
      rounded
      title={title}
      subtitle={
        days.length > 0
          ? `Each day, ${formatDataDate(dayStart(days[0]))} to ${formatDataDate(dayStart(days[days.length - 1]))}`
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
