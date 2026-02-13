import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import type { FctNodeDiskIoHourly, FctNodeDiskIoDaily } from '@/api/types.gen';
import type { TimePeriod } from '../constants';
import { formatBytes, formatTimeTooltip } from '../utils';

type DiskRow = FctNodeDiskIoHourly | FctNodeDiskIoDaily;

function isHourly(row: DiskRow): row is FctNodeDiskIoHourly {
  return 'hour_start_date_time' in row;
}

function getTimestamp(row: DiskRow): number {
  if (isHourly(row)) return row.hour_start_date_time ?? 0;
  const daily = row as FctNodeDiskIoDaily;
  return daily.day_start_date ? Math.floor(new Date(daily.day_start_date).getTime() / 1000) : 0;
}

interface NodeDiskIoChartProps {
  data: DiskRow[];
  timePeriod: TimePeriod;
  filterNode?: string;
}

export function NodeDiskIoChart({ data, timePeriod, filterNode }: NodeDiskIoChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, timestamps } = useMemo(() => {
    const filtered = filterNode ? data.filter(d => d.meta_client_name === filterNode) : data;

    // Sum read + write per node per timestamp
    const grouped = new Map<string, Map<number, number>>();
    for (const row of filtered) {
      const name = row.meta_client_name ?? 'unknown';
      if (!grouped.has(name)) grouped.set(name, new Map());
      const ts = getTimestamp(row);
      const existing = grouped.get(name)!.get(ts) ?? 0;
      grouped.get(name)!.set(ts, existing + (row.avg_io_bytes ?? 0));
    }

    const allTimestamps = new Set<number>();
    for (const row of filtered) allTimestamps.add(getTimestamp(row));
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const chartSeries: SeriesData[] = [];
    let colorIndex = 0;
    for (const [name, timeMap] of grouped) {
      chartSeries.push({
        name,
        data: sortedTimestamps.map(ts => [ts, timeMap.get(ts) ?? 0] as [number, number]),
        color: CHART_CATEGORICAL_COLORS[colorIndex % CHART_CATEGORICAL_COLORS.length],
        lineWidth: 2,
        smooth: 0.4,
        showArea: true,
        areaOpacity: 0.08,
      });
      colorIndex++;
    }

    return { series: chartSeries, timestamps: sortedTimestamps };
  }, [data, filterNode, CHART_CATEGORICAL_COLORS]);

  const subtitle = filterNode
    ? `${timePeriod} · Combined read + write`
    : `${timePeriod} · Avg disk I/O per node (read + write)`;

  return (
    <PopoutCard title="Disk I/O" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{ type: 'time', timestamps }}
          yAxis={{
            name: 'Avg bytes / slot',
            min: 0,
            formatter: (v: number) => formatBytes(v, 1),
          }}
          height={inModal ? 500 : 350}
          showLegend
          legendPosition="bottom"
          enableSeriesFilter={series.length > 5}
          tooltipMode={series.length > 5 ? 'compact' : 'default'}
          syncGroup="node-time"
          tooltipFormatter={(params: unknown) => {
            const items = (Array.isArray(params) ? params : [params]) as Array<{
              marker: string;
              seriesName: string;
              value: [number, number] | number;
            }>;
            return formatTimeTooltip(items, v => formatBytes(Number(v), 1));
          }}
        />
      )}
    </PopoutCard>
  );
}
