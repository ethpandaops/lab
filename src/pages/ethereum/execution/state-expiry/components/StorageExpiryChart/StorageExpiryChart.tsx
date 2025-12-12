import { type JSX, useMemo, useCallback } from 'react';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { formatSmartDecimal } from '@/utils';
import type { StorageSlotDataPoint } from '../../hooks';

interface StorageExpiryChartProps {
  data: StorageSlotDataPoint[];
}

function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function formatBytesLabel(gb: number): string {
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(2)} GB`;
}

export function StorageExpiryChart({ data }: StorageExpiryChartProps): JSX.Element {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const labels = data.map(item => item.dateLabel);

    return {
      labels,
      series: [
        {
          name: 'Active Storage',
          data: data.map(item => bytesToGB(item.effectiveBytesWithExpiry)),
          showArea: true,
          areaOpacity: 0.3,
          lineWidth: 2,
          stack: 'total',
        },
        {
          name: 'Expired Storage',
          data: data.map(item => bytesToGB(item.expiredBytes)),
          showArea: true,
          areaOpacity: 0.3,
          lineWidth: 2,
          stack: 'total',
          color: '#f59e0b', // amber-500
        },
      ],
    };
  }, [data]);

  const tooltipFormatter = useCallback(
    (params: unknown): string => {
      const dataPoints = Array.isArray(params) ? params : [params];
      let html = '';

      if (dataPoints.length > 0 && dataPoints[0]) {
        const firstPoint = dataPoints[0] as { axisValue?: string; dataIndex?: number };
        if (firstPoint.axisValue !== undefined) {
          html += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${firstPoint.axisValue}</div>`;
        }

        // Calculate total from the data
        if (chartData && firstPoint.dataIndex !== undefined) {
          const dataIndex = firstPoint.dataIndex;
          const activeGB = chartData.series[0].data[dataIndex] as number;
          const expiredGB = chartData.series[1].data[dataIndex] as number;
          const totalGB = activeGB + expiredGB;

          html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(128, 128, 128, 0.2);">`;
          html += `<span style="font-weight: 500;">Total:</span>`;
          html += `<span style="font-weight: 700; margin-left: auto; font-size: 14px;">${formatBytesLabel(totalGB)}</span>`;
          html += `</div>`;
        }
      }

      dataPoints.forEach(point => {
        const p = point as {
          marker?: string;
          seriesName?: string;
          value?: number | [number, number];
        };

        if (p.marker && p.seriesName !== undefined) {
          const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
          if (yValue !== undefined && yValue !== null) {
            const dataIndex = (dataPoints[0] as { dataIndex?: number })?.dataIndex ?? 0;
            const activeGB = (chartData?.series[0].data[dataIndex] as number) ?? 0;
            const expiredGB = (chartData?.series[1].data[dataIndex] as number) ?? 0;
            const total = activeGB + expiredGB;
            const percentage = total > 0 ? ((yValue / total) * 100).toFixed(1) : '0.0';

            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">`;
            html += p.marker;
            html += `<span>${p.seriesName}:</span>`;
            html += `<span style="margin-left: auto; opacity: 0.7;">${percentage}%</span>`;
            html += `<span style="font-weight: 600; min-width: 80px; text-align: right;">${formatBytesLabel(yValue)}</span>`;
            html += `</div>`;
          }
        }
      });

      return html;
    },
    [chartData]
  );

  if (!chartData) {
    return (
      <Card rounded className="p-6">
        <p className="text-muted">No data available</p>
      </Card>
    );
  }

  return (
    <Card rounded className="p-6">
      <MultiLineChart
        title="Cumulative Storage Over Time"
        subtitle="Daily snapshot of active vs expired storage slots (stacked by bytes)"
        series={chartData.series}
        xAxis={{
          type: 'category',
          labels: chartData.labels,
          name: 'Date',
        }}
        yAxis={{
          name: 'Size (GB)',
          min: 0,
        }}
        height={480}
        showLegend={true}
        enableDataZoom={true}
        tooltipFormatter={tooltipFormatter}
      />
    </Card>
  );
}
