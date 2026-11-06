import { type JSX, useMemo } from 'react';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Table } from '@/components/Lists/Table';
import { getDataVizColors } from '@/utils/dataVizColors';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { SLOT_AGE_BUCKETS, SLOT_AGE_LABELS, type ProbeAgeSummary } from '../../utils/probe-age';

export interface ProbeAgeAvailabilityProps {
  data: ProbeAgeSummary | undefined;
  isLoading: boolean;
  /** "Since …" label for the window, shared with the grid */
  subtitle?: string;
}

function percent(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(2)}%`;
}

/**
 * Share of custody probes answered with the column, by how old the probed slot was: per day, and per probed
 * peer client over the window.
 */
export function ProbeAgeAvailability({ data, isLoading, subtitle }: ProbeAgeAvailabilityProps): JSX.Element {
  const { series, labels, yMin, yInterval } = useMemo(() => {
    if (!data) return { series: [] as SeriesData[], labels: [] as string[], yMin: 0, yInterval: 20 };
    const palette = getDataVizColors().CHART_CATEGORICAL_COLORS;
    // Start the axis just below the lowest day, on a multiple of the tick interval, so ticks stay evenly spaced to 100%
    const lowest = Math.min(...SLOT_AGE_BUCKETS.flatMap(bucket => data.byDay[bucket].filter(v => v !== null)));
    const interval = lowest >= 75 ? 5 : lowest >= 50 ? 10 : 20;
    return {
      yMin: Number.isFinite(lowest) ? Math.floor(lowest / interval) * interval : 0,
      yInterval: interval,
      labels: data.days.map(formatDailyDate),
      series: SLOT_AGE_BUCKETS.map((bucket, index) => ({
        name: SLOT_AGE_LABELS[bucket],
        data: data.byDay[bucket].map(value => (value === null ? null : Number(value.toFixed(2)))),
        color: palette[index % palette.length],
        showSymbol: false,
      })),
    };
  }, [data]);

  return (
    <Card title="Availability by slot age" subtitle={subtitle}>
      {isLoading || !data ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : data.days.length === 0 ? (
        <p className="text-sm text-muted">No custody probes yet.</p>
      ) : (
        <div className="space-y-6">
          <MultiLineChart
            series={series}
            xAxis={{ type: 'category', labels, name: 'Date' }}
            yAxis={{
              name: 'Availability (%)',
              min: yMin,
              max: 100,
              minInterval: yInterval,
              formatter: (value: number | string) => `${value}%`,
            }}
            height={320}
            showLegend
            legendPosition="top"
            enableDataZoom
          />
          <div className="-mx-(--card-inset) overflow-x-auto px-(--card-inset)">
            <Table
              variant="nested"
              data={data.byClient}
              getRowKey={row => row.client}
              columns={[
                {
                  header: 'Client',
                  accessor: row => (
                    <span className="flex items-center gap-2">
                      <ClientLogo client={row.client} size={16} decorative />
                      <span className="capitalize">{row.client}</span>
                    </span>
                  ),
                },
                ...SLOT_AGE_BUCKETS.map(bucket => ({
                  header: SLOT_AGE_LABELS[bucket],
                  accessor: (row: ProbeAgeSummary['byClient'][number]) => percent(row.availability[bucket]),
                  cellClassName: 'text-right tabular-nums',
                  headerClassName: 'text-right',
                })),
              ]}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
