import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import type { FctNodeMemoryUsageHourly, FctNodeMemoryUsageDaily } from '@/api/types.gen';
import type { TimePeriod } from '../constants';
import { formatBytes } from '../utils';

type MemoryRow = FctNodeMemoryUsageHourly | FctNodeMemoryUsageDaily;

function isHourly(row: MemoryRow): row is FctNodeMemoryUsageHourly {
  return 'hour_start_date_time' in row;
}

function getTimestamp(row: MemoryRow): number {
  if (isHourly(row)) {
    return row.hour_start_date_time ?? 0;
  }
  const daily = row as FctNodeMemoryUsageDaily;
  return daily.day_start_date ? Math.floor(new Date(daily.day_start_date).getTime() / 1000) : 0;
}

interface NodeMemoryChartProps {
  data: MemoryRow[];
  timePeriod: TimePeriod;
  filterNode?: string;
}

export function NodeMemoryChart({ data, timePeriod, filterNode }: NodeMemoryChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, timestamps } = useMemo(() => {
    const filtered = filterNode ? data.filter(d => d.meta_client_name === filterNode) : data;

    const grouped = new Map<string, MemoryRow[]>();
    for (const row of filtered) {
      const name = row.meta_client_name ?? 'unknown';
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(row);
    }

    const allTimestamps = new Set<number>();
    for (const row of filtered) {
      allTimestamps.add(getTimestamp(row));
    }
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const chartSeries: SeriesData[] = [];
    let colorIndex = 0;

    for (const [name, rows] of grouped) {
      const timeMap = new Map<number, number>();
      for (const row of rows) {
        const ts = getTimestamp(row);
        timeMap.set(ts, row.avg_vm_rss_bytes ?? 0);
      }

      const points: Array<[number, number]> = sortedTimestamps.map(ts => [ts, timeMap.get(ts) ?? 0]);

      chartSeries.push({
        name,
        data: points,
        color: CHART_CATEGORICAL_COLORS[colorIndex % CHART_CATEGORICAL_COLORS.length],
        lineWidth: 1.5,
        smooth: 0.3,
      });
      colorIndex++;
    }

    return { series: chartSeries, timestamps: sortedTimestamps };
  }, [data, filterNode, CHART_CATEGORICAL_COLORS]);

  const subtitle = filterNode ? `${timePeriod} - RSS memory` : `${timePeriod} - Avg RSS memory per node`;

  return (
    <PopoutCard title="Memory Usage" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'time',
            timestamps,
          }}
          yAxis={{
            name: 'Memory',
            min: 0,
            formatter: (v: number) => formatBytes(v, 1),
          }}
          height={inModal ? 500 : 300}
          showLegend={series.length > 1}
          enableSeriesFilter={series.length > 5}
          tooltipMode={series.length > 5 ? 'compact' : 'default'}
          syncGroup="node-time"
        />
      )}
    </PopoutCard>
  );
}
