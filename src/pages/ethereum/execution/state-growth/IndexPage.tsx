import { type JSX, useMemo, useCallback } from 'react';
import { Header } from '@/components/Layout/Header';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { formatSmartDecimal } from '@/utils';
import { useStateSizeData } from './hooks';
import { StateSizeSkeleton, StateDeltaCards } from './components';

/**
 * Format bytes to a human-readable string (GB/TB)
 */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(2)} GB`;
}

/**
 * State Growth page - Shows Ethereum execution layer state growth over time
 */
export function IndexPage(): JSX.Element {
  const { data, latestData, isLoading, error } = useStateSizeData();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const labels = data.map(item => item.dateLabel);
    const bytesToGB = (bytes: number): number => bytes / (1024 * 1024 * 1024);

    return {
      labels,
      totalValues: data.map(item => bytesToGB(item.total_bytes)),
      series: [
        {
          name: 'Accounts',
          data: data.map(item => bytesToGB(item.account_trienode_bytes)),
          showArea: true,
          stack: 'total',
        },
        {
          name: 'Storage Slots',
          data: data.map(item => bytesToGB(item.storage_trienode_bytes)),
          showArea: true,
          stack: 'total',
        },
        {
          name: 'Contract Codes',
          data: data.map(item => bytesToGB(item.contract_code_bytes)),
          showArea: true,
          stack: 'total',
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
          html += `<div style="margin-bottom: 4px; font-weight: 600;">${firstPoint.axisValue}</div>`;
        }

        // Add Total as the first item
        if (chartData && firstPoint.dataIndex !== undefined) {
          const totalValue = chartData.totalValues[firstPoint.dataIndex];
          if (totalValue !== undefined) {
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid rgba(128, 128, 128, 0.2);">`;
            html += `<span style="font-weight: 500;">Total:</span>`;
            html += `<span style="font-weight: 600; margin-left: auto;">${formatSmartDecimal(totalValue, 2)} GB</span>`;
            html += `</div>`;
          }
        }
      }

      // Add each series
      dataPoints.forEach(point => {
        const p = point as {
          marker?: string;
          seriesName?: string;
          value?: number | [number, number];
        };

        if (p.marker && p.seriesName !== undefined) {
          const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
          if (yValue !== undefined && yValue !== null) {
            html += `<div style="display: flex; align-items: center; gap: 8px;">`;
            html += p.marker;
            html += `<span>${p.seriesName}:</span>`;
            html += `<span style="font-weight: 600; margin-left: auto;">${formatSmartDecimal(yValue, 2)} GB</span>`;
            html += `</div>`;
          }
        }
      });

      return html;
    },
    [chartData]
  );

  return (
    <Container>
      <Header title="State Growth" description="Track Ethereum execution layer state growth over time" />

      {isLoading && <StateSizeSkeleton />}

      {error && (
        <Card className="p-6">
          <p className="text-danger">Failed to load state size data: {error.message}</p>
        </Card>
      )}

      {(chartData || latestData) && (
        <div className="space-y-6">
          {/* Main content: Chart (left) + Stats sidebar (right) */}
          <div className="flex flex-col gap-6 xl:flex-row">
            {/* Chart - takes most of the width */}
            {chartData && (
              <Card className="min-w-0 flex-1 p-6">
                <MultiLineChart
                  title="State Growth Over Time"
                  subtitle="Daily snapshot of Ethereum state components"
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
                  height={500}
                  showLegend={true}
                  enableDataZoom={true}
                  tooltipFormatter={tooltipFormatter}
                />
              </Card>
            )}

            {/* Right sidebar - stacked stat cards */}
            {latestData && (
              <div className="flex w-full shrink-0 flex-col gap-4 xl:w-64">
                {/* Total State Size - prominent */}
                <Card className="p-4">
                  <p className="text-xs text-muted">Total State Size</p>
                  <p className="text-3xl font-bold text-foreground">{formatBytes(latestData.total_bytes)}</p>
                </Card>

                {/* Accounts */}
                <Card className="p-4">
                  <p className="text-xs text-muted">Accounts</p>
                  <p className="text-xl font-bold text-foreground">{formatBytes(latestData.account_trienode_bytes)}</p>
                  <p className="mt-1 text-sm text-muted">{latestData.accounts.toLocaleString()}</p>
                </Card>

                {/* Storage Slots */}
                <Card className="p-4">
                  <p className="text-xs text-muted">Storage Slots</p>
                  <p className="text-xl font-bold text-foreground">{formatBytes(latestData.storage_trienode_bytes)}</p>
                  <p className="mt-1 text-sm text-muted">{latestData.storages.toLocaleString()}</p>
                </Card>

                {/* Contract Codes */}
                <Card className="p-4">
                  <p className="text-xs text-muted">Contract Codes</p>
                  <p className="text-xl font-bold text-foreground">{formatBytes(latestData.contract_code_bytes)}</p>
                  <p className="mt-1 text-sm text-muted">{latestData.contract_codes.toLocaleString()}</p>
                </Card>
              </div>
            )}
          </div>

          {/* State delta cards - bottom section */}
          {data && <StateDeltaCards data={data} />}
        </div>
      )}
    </Container>
  );
}
