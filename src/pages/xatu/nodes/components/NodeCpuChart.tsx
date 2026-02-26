import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils';
import type { FctNodeCpuUtilizationHourly, FctNodeCpuUtilizationDaily } from '@/api/types.gen';
import type { TimePeriod } from '../constants';
import { buildTimeSeries, formatTimeTooltip } from '../utils';

type CpuRow = FctNodeCpuUtilizationHourly | FctNodeCpuUtilizationDaily;

interface NodeCpuChartProps {
  data: CpuRow[];
  timePeriod: TimePeriod;
  filterNode?: string;
}

export function NodeCpuChart({ data, timePeriod, filterNode }: NodeCpuChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, timestamps } = useMemo(() => {
    return buildTimeSeries({
      data,
      filterNode,
      getValue: row => row.avg_core_pct ?? 0,
      colors: CHART_CATEGORICAL_COLORS,
    });
  }, [data, filterNode, CHART_CATEGORICAL_COLORS]);

  const subtitle = filterNode ? `${timePeriod} · CPU utilization` : `${timePeriod} · Avg CPU utilization per node`;

  return (
    <PopoutCard title="CPU Utilization" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{ type: 'time', timestamps }}
          yAxis={{
            name: '% of all cores',
            min: 0,
            formatter: (v: number) => `${v.toFixed(1)}%`,
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
            return formatTimeTooltip(items, v => `${Number(v).toFixed(1)}%`);
          }}
        />
      )}
    </PopoutCard>
  );
}
