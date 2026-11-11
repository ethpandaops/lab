import { type JSX, type ReactNode, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { getClientColor } from '@/utils/ethereum';
import { UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { ratio, type ClientMetric } from '../../utils/client-metrics';

export interface ClientMetricCompareProps<T extends { day_start_date?: string; client?: string }> {
  /** Client the page is about, drawn on top and highlighted in the table */
  client?: string;
  title: string;
  subtitle?: string;
  rows: T[];
  metrics: Array<ClientMetric<T>>;
  /** Count shown beside each client in the table, e.g. blocks or validators */
  countLabel: string;
  count: (row: T) => number;
  isLoading: boolean;
  /** Controls in the card header, e.g. a window */
  actions?: ReactNode;
  /** Shown under the chart and table */
  footer?: ReactNode;
}

/** Windows longer than this many days are drawn per week, so small clients' days do not swing the lines */
const WEEKLY_AFTER_DAYS = 120;

/** Monday of a UTC day's week (YYYY-MM-DD) */
function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/**
 * One metric for every client of a layer: a daily (weekly over long windows) line per client with the page's client on top, and a table of
 * each client's value over the window, ranked. The metric is chosen from a menu.
 */
export function ClientMetricCompare<T extends { day_start_date?: string; client?: string }>({
  client,
  title,
  subtitle,
  rows,
  metrics,
  countLabel,
  count,
  isLoading,
  actions,
  footer,
}: ClientMetricCompareProps<T>): JSX.Element {
  const [metricId, setMetricId] = useState(metrics[0].id);
  const metric = metrics.find(item => item.id === metricId) ?? metrics[0];

  const { series, labels, table, weekly } = useMemo(() => {
    const byClient = new Map<string, T[]>();
    const days = new Set<string>();
    for (const row of rows) {
      const name = row.client ?? UNKNOWN_CLIENT;
      if (name === UNKNOWN_CLIENT) continue;
      byClient.set(name, [...(byClient.get(name) ?? []), row]);
      if (row.day_start_date) days.add(row.day_start_date);
    }
    const allDays = [...days].sort();
    const weekly =
      allDays.length > 1 &&
      (Date.parse(allDays[allDays.length - 1]) - Date.parse(allDays[0])) / 86_400_000 > WEEKLY_AFTER_DAYS;
    const bucket = (day: string): string => (weekly ? weekStart(day) : day);
    const sortedDays = [...new Set(allDays.map(bucket))];
    const clients = [...byClient.entries()]
      .map(([name, clientRows]) => ({
        client: name,
        value: ratio(clientRows, metric),
        count: clientRows.reduce((sum, row) => sum + count(row), 0),
        rows: clientRows,
      }))
      .sort((a, b) => b.count - a.count);

    const chartSeries: SeriesData[] = clients
      .filter(entry => entry.value !== null)
      .sort((a, b) => Number(a.client === client) - Number(b.client === client))
      .map(entry => {
        const byDay = new Map<string, T[]>();
        for (const row of entry.rows) {
          const key = bucket(row.day_start_date ?? '');
          byDay.set(key, [...(byDay.get(key) ?? []), row]);
        }
        const isFocus = entry.client === client;
        return {
          name: formatClientName(entry.client),
          client: entry.client,
          color: getClientColor(entry.client),
          data: sortedDays.map(day => {
            const value = ratio(byDay.get(day) ?? [], metric);
            return value === null ? null : Number(value.toFixed(4));
          }),
          lineWidth: isFocus ? 2.5 : 1,
          showSymbol: false,
          initiallyVisible: true,
        };
      });

    const ranked = clients
      .filter(entry => entry.value !== null)
      .sort((a, b) => (metric.lowerIsBetter ? a.value! - b.value! : b.value! - a.value!));
    return { series: chartSeries, labels: sortedDays.map(formatDailyDate), table: ranked, weekly };
  }, [rows, metric, client, count]);

  return (
    <Card
      rounded
      title={title}
      subtitle={subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SelectMenu
            value={metricId}
            onChange={setMetricId}
            options={metrics.map(item => ({ value: item.id, label: item.label }))}
            expandToFit
          />
          {actions}
        </div>
      }
    >
      {isLoading ? (
        <LoadingContainer className="h-80 rounded-sm" />
      ) : table.length === 0 ? (
        <p className="text-sm text-muted">No data in this window.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MultiLineChart
              series={series}
              xAxis={{ type: 'category', labels, name: weekly ? 'Week' : 'Date' }}
              yAxis={{ name: metric.axis }}
              height={320}
              showLegend
              legendPosition="top"
            />
            <table className="w-full self-start text-sm/6">
              <thead>
                <tr className="text-left text-xs/5 text-muted">
                  <th className="pb-1 font-normal">Client</th>
                  <th className="pb-1 text-right font-normal">{metric.label}</th>
                  <th className="pb-1 text-right font-normal">{countLabel}</th>
                </tr>
              </thead>
              <tbody>
                {table.map(entry => (
                  <tr key={entry.client} className={clsx(entry.client === client && 'bg-primary/10')}>
                    <td className="py-0.5 pl-1">
                      {entry.client === client ? (
                        <ClientLabel client={entry.client} noLink />
                      ) : (
                        <Link
                          to="/ethereum/clients/$client"
                          params={{ client: entry.client }}
                          className="hover:underline"
                        >
                          <ClientLabel client={entry.client} noLink />
                        </Link>
                      )}
                    </td>
                    <td className="py-0.5 text-right font-medium text-foreground tabular-nums">
                      {metric.format(entry.value!)}
                    </td>
                    <td className="py-0.5 pr-1 text-right text-muted tabular-nums">{entry.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer && <p className="text-xs/5 text-muted">{footer}</p>}
        </div>
      )}
    </Card>
  );
}
