import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import type { FctNodeCpuUtilizationHourly, FctNodeCpuUtilizationDaily } from '@/api/types.gen';
import type { TimePeriod } from '../constants';

type CpuRow = FctNodeCpuUtilizationHourly | FctNodeCpuUtilizationDaily;

function isHourly(row: CpuRow): row is FctNodeCpuUtilizationHourly {
  return 'hour_start_date_time' in row;
}

function getTimestamp(row: CpuRow): number {
  if (isHourly(row)) {
    return row.hour_start_date_time ?? 0;
  }
  const daily = row as FctNodeCpuUtilizationDaily;
  return daily.day_start_date ? Math.floor(new Date(daily.day_start_date).getTime() / 1000) : 0;
}

interface NodeCpuChartProps {
  data: CpuRow[];
  timePeriod: TimePeriod;
  /** When set, show only this node (detail page). Otherwise show all nodes. */
  filterNode?: string;
}

export function NodeCpuChart({ data, timePeriod, filterNode }: NodeCpuChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, timestamps } = useMemo(() => {
    const filtered = filterNode ? data.filter(d => d.meta_client_name === filterNode) : data;

    // Group by meta_client_name
    const grouped = new Map<string, CpuRow[]>();
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
        timeMap.set(ts, row.avg_core_pct ?? 0);
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

  const subtitle = filterNode ? `${timePeriod} - CPU utilization` : `${timePeriod} - Avg CPU utilization per node`;

  return (
    <PopoutCard title="CPU Utilization" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'time',
            timestamps,
          }}
          yAxis={{
            name: '% of all cores',
            min: 0,
            formatter: (v: number) => `${v.toFixed(1)}%`,
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
