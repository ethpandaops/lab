import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils';
import type { FctNodeMemoryUsageHourly, FctNodeMemoryUsageDaily } from '@/api/types.gen';
import type { TimePeriod } from '../constants';
import { formatBytes, buildTimeSeries, formatTimeTooltip } from '../utils';

type MemoryRow = FctNodeMemoryUsageHourly | FctNodeMemoryUsageDaily;

interface NodeMemoryChartProps {
  data: MemoryRow[];
  timePeriod: TimePeriod;
  filterNode?: string;
}

export function NodeMemoryChart({ data, timePeriod, filterNode }: NodeMemoryChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, timestamps } = useMemo(() => {
    return buildTimeSeries({
      data,
      filterNode,
      getValue: row => row.avg_vm_rss_bytes ?? 0,
      colors: CHART_CATEGORICAL_COLORS,
    });
  }, [data, filterNode, CHART_CATEGORICAL_COLORS]);

  const subtitle = filterNode ? `${timePeriod} · RSS memory` : `${timePeriod} · Avg RSS memory per node`;

  return (
    <PopoutCard title="Memory Usage" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{ type: 'time', timestamps }}
          yAxis={{
            name: 'Memory',
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
