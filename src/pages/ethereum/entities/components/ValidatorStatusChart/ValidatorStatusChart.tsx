import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { ValidatorStatusChartProps } from './ValidatorStatusChart.types';

const HIDDEN_STATUSES = new Set(['withdrawal_done']);

const STATUS_COLORS: Record<string, string> = {
  active_ongoing: '#22c55e',
  active_exiting: '#eab308',
  active_slashed: '#ef4444',
  pending_initialized: '#60a5fa',
  pending_queued: '#3b82f6',
  exited_unslashed: '#6b7280',
  exited_slashed: '#dc2626',
  withdrawal_possible: '#9ca3af',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#8b5cf6';
}

const SUBTITLE_MAP: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '180d': 'Last 180 days',
  all: 'All time',
};

export function ValidatorStatusChart({ data, timePeriod }: ValidatorStatusChartProps): React.JSX.Element {
  const series = useMemo(() => {
    if (!data) return [];

    return data.statuses
      .filter(status => !HIDDEN_STATUSES.has(status))
      .map(status => {
        const dayMap = data.byStatus.get(status)!;
        const chartData: Array<[string, number]> = data.days.map(day => [day, dayMap.get(day) ?? 0]);

        return {
          name: status.replace(/_/g, ' '),
          data: chartData,
          color: getStatusColor(status),
          stack: 'validator-status',
          showArea: true,
          areaOpacity: 0.85,
          lineWidth: 0,
          showSymbol: false,
        };
      });
  }, [data]);

  const subtitle = SUBTITLE_MAP[timePeriod] ?? 'Last 30 days';

  if (!data || series.length === 0) {
    return (
      <PopoutCard title="Validator Count by Status" subtitle="No data available">
        {() => (
          <Alert variant="info" title="No Data" description="No validator status data available for this entity." />
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Validator Count by Status"
      subtitle={subtitle}
      modalSize="full"
      anchorId="validator-status-chart"
    >
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'category',
            labels: data.days,
          }}
          yAxis={{
            name: 'Validators',
            min: 0,
            minInterval: 1,
          }}
          height={inModal ? 600 : 400}
          showLegend={true}
          enableDataZoom={true}
        />
      )}
    </PopoutCard>
  );
}
