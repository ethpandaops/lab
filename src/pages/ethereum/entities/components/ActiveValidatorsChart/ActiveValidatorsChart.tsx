import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { EntityValidatorStatusData } from '../../hooks/useEntityValidatorStatusData';
import type { TimePeriod } from '../../constants';

const ACTIVE_STATUSES = new Set(['active_ongoing', 'active_exiting']);

const SUBTITLE_MAP: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '180d': 'Last 180 days',
  all: 'All time',
};

interface ActiveValidatorsChartProps {
  data: EntityValidatorStatusData | null;
  timePeriod: TimePeriod;
}

export function ActiveValidatorsChart({ data, timePeriod }: ActiveValidatorsChartProps): React.JSX.Element {
  const { series, yMin } = useMemo(() => {
    if (!data) return { series: [], yMin: 0 };

    let minVal = Infinity;
    const chartData: Array<[string, number]> = data.days.map(day => {
      let total = 0;
      for (const status of ACTIVE_STATUSES) {
        total += data.byStatus.get(status)?.get(day) ?? 0;
      }
      if (total < minVal) minVal = total;
      return [day, total];
    });

    // Round down to a nice boundary (nearest 1000, 5000, or 10000 depending on magnitude)
    const step = minVal > 100000 ? 10000 : minVal > 10000 ? 5000 : 1000;
    const roundedMin = Math.floor(minVal / step) * step;

    return {
      series: [
        {
          name: 'Active Validators',
          data: chartData,
          color: '#22c55e',
          showArea: true,
          areaOpacity: 0.15,
          lineWidth: 2,
          showSymbol: false,
        },
      ],
      yMin: roundedMin,
    };
  }, [data]);

  const subtitle = SUBTITLE_MAP[timePeriod] ?? 'Last 30 days';

  if (!data || series.length === 0) {
    return (
      <PopoutCard title="Active Validators" subtitle="No data available">
        {() => (
          <Alert variant="info" title="No Data" description="No active validator data available for this entity." />
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="Active Validators" subtitle={subtitle} modalSize="full" anchorId="active-validators-chart">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'category',
            labels: data.days,
          }}
          yAxis={{
            name: 'Validators',
            min: yMin,
            minInterval: 1,
          }}
          height={inModal ? 600 : 400}
          showLegend={false}
          enableDataZoom={true}
        />
      )}
    </PopoutCard>
  );
}
