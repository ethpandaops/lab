import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import type { FctNodeNetworkIoHourly, FctNodeNetworkIoDaily } from '@/api/types.gen';
import type { TimePeriod } from '../constants';
import { formatBytes } from '../utils';

type NetworkRow = FctNodeNetworkIoHourly | FctNodeNetworkIoDaily;

function isHourly(row: NetworkRow): row is FctNodeNetworkIoHourly {
  return 'hour_start_date_time' in row;
}

function getTimestamp(row: NetworkRow): number {
  if (isHourly(row)) {
    return row.hour_start_date_time ?? 0;
  }
  const daily = row as FctNodeNetworkIoDaily;
  return daily.day_start_date ? Math.floor(new Date(daily.day_start_date).getTime() / 1000) : 0;
}

interface NodeNetworkIoChartProps {
  data: NetworkRow[];
  timePeriod: TimePeriod;
  filterNode?: string;
}

export function NodeNetworkIoChart({ data, timePeriod, filterNode }: NodeNetworkIoChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, timestamps } = useMemo(() => {
    const filtered = filterNode ? data.filter(d => d.meta_client_name === filterNode) : data;

    // Sum all port labels and directions per node per timestamp
    const grouped = new Map<string, Map<number, number>>();
    for (const row of filtered) {
      const name = row.meta_client_name ?? 'unknown';
      if (!grouped.has(name)) grouped.set(name, new Map());
      const ts = getTimestamp(row);
      const existing = grouped.get(name)!.get(ts) ?? 0;
      grouped.get(name)!.set(ts, existing + (row.avg_io_bytes ?? 0));
    }

    const allTimestamps = new Set<number>();
    for (const row of filtered) {
      allTimestamps.add(getTimestamp(row));
    }
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const chartSeries: SeriesData[] = [];
    let colorIndex = 0;

    for (const [name, timeMap] of grouped) {
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

  const subtitle = filterNode ? `${timePeriod} - All ports combined` : `${timePeriod} - Avg network I/O per node`;

  return (
    <PopoutCard title="Network I/O" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'time',
            timestamps,
          }}
          yAxis={{
            name: 'Bytes / slot',
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
