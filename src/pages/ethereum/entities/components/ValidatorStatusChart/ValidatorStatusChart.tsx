import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';

import type { ValidatorStatusChartProps } from './ValidatorStatusChart.types';

const HIDDEN_STATUSES = new Set(['withdrawal_done']);

function getStatusColor(status: string, themeColors: ThemeColors): string {
  const { DATA_COLORS } = getDataVizColors();
  const statusColors: Record<string, string> = {
    active_ongoing: themeColors.success,
    active_exiting: themeColors.warning,
    active_slashed: themeColors.danger,
    pending_initialized: DATA_COLORS.sky,
    pending_queued: DATA_COLORS.blue,
    exited_unslashed: themeColors.muted,
    exited_slashed: themeColors.danger,
    withdrawal_possible: DATA_COLORS.slate,
  };
  return statusColors[status] ?? DATA_COLORS.violet;
}

const SUBTITLE_MAP: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '180d': 'Last 180 days',
  all: 'All time',
};

export function ValidatorStatusChart({ data, timePeriod }: ValidatorStatusChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const series = useMemo(() => {
    if (!data) return [];

    return data.statuses
      .filter(status => !HIDDEN_STATUSES.has(status))
      .map(status => {
        const dayMap = data.byStatus.get(status)!;
        const chartData: number[] = data.days.map(day => dayMap.get(day) ?? 0);

        return {
          name: status.replace(/_/g, ' '),
          data: chartData,
          color: getStatusColor(status, themeColors),
          stack: 'validator-status',
          showArea: true,
          areaOpacity: 0.85,
          lineWidth: 0,
          showSymbol: false,
        };
      });
  }, [data, themeColors]);

  const subtitle = SUBTITLE_MAP[timePeriod] ?? 'Last 30 days';

  if (!data || series.length === 0) {
    return (
      <PopoutCard title="Validator Count by Status">
        {() => <Alert variant="info" description="No validator status data available for this entity." />}
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
