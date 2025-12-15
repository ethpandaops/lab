import { type JSX, useMemo, useCallback, useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { formatSmartDecimal } from '@/utils';
import { useStateSizeData, useStateDelta, type DeltaTimeframe } from './hooks';
import { StateSizeSkeleton } from './components';

const TIMEFRAME_OPTIONS: { value: DeltaTimeframe; label: string }[] = [
  { value: 'daily', label: '24h' },
  { value: 'weekly', label: '7d' },
  { value: 'monthly', label: '30d' },
  { value: 'yearly', label: '1Y' },
];

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(2)} GB`;
}

function formatDeltaBytes(bytes: number): string {
  const absBytes = Math.abs(bytes);
  const sign = bytes >= 0 ? '+' : '-';

  if (absBytes >= 1024 * 1024 * 1024) {
    return `${sign}${(absBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (absBytes >= 1024 * 1024) {
    return `${sign}${(absBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (absBytes >= 1024) {
    return `${sign}${(absBytes / 1024).toFixed(2)} KB`;
  }
  return `${sign}${absBytes.toFixed(0)} B`;
}

export function IndexPage(): JSX.Element {
  const { data, latestData, isLoading, error } = useStateSizeData();
  const [timeframe, setTimeframe] = useState<DeltaTimeframe>('daily');
  const delta = useStateDelta(data, timeframe);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const labels = data.map(item => item.dateLabel);
    const bytesToGB = (bytes: number): number => bytes / (1024 * 1024 * 1024);

    return {
      labels,
      totalValues: data.map(item => bytesToGB(item.total_bytes)),
      series: [
        {
          name: 'Account Trie',
          data: data.map(item => bytesToGB(item.account_trienode_bytes)),
          showArea: true,
          stack: 'total',
        },
        {
          name: 'Storage Tries',
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
          html += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${firstPoint.axisValue}</div>`;
        }

        if (chartData && firstPoint.dataIndex !== undefined) {
          const totalValue = chartData.totalValues[firstPoint.dataIndex];
          if (totalValue !== undefined) {
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(128, 128, 128, 0.2);">`;
            html += `<span style="font-weight: 500;">Total:</span>`;
            html += `<span style="font-weight: 700; margin-left: auto; font-size: 14px;">${formatSmartDecimal(totalValue, 2)} GB</span>`;
            html += `</div>`;
          }
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
            const total = chartData?.totalValues[(dataPoints[0] as { dataIndex?: number })?.dataIndex ?? 0] ?? 1;
            const percentage = ((yValue / total) * 100).toFixed(1);
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">`;
            html += p.marker;
            html += `<span>${p.seriesName}:</span>`;
            html += `<span style="margin-left: auto; opacity: 0.7;">${percentage}%</span>`;
            html += `<span style="font-weight: 600; min-width: 70px; text-align: right;">${formatSmartDecimal(yValue, 2)} GB</span>`;
            html += `</div>`;
          }
        }
      });

      return html;
    },
    [chartData]
  );

  const totalIsPositive = delta ? delta.total.delta >= 0 : true;
  const TotalIcon = totalIsPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <Container>
      {/* Header with title and global timeframe filter */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl/tight font-bold text-foreground">State Growth</h1>
          <p className="mt-1 text-muted">
            Track Ethereum execution layer state growth over time (data extracted from go-ethereum node)
          </p>
        </div>

        {/* Global timeframe toggle */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Compare:</span>
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface/50 p-0.5">
              {TIMEFRAME_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeframe(option.value)}
                  className={clsx(
                    'rounded-xs px-3 py-1.5 text-xs font-medium transition-all',
                    timeframe === option.value
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-muted/10 hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {delta && (
            <p className="text-xs text-muted">
              {delta.previousDate} → {delta.currentDate}
            </p>
          )}
        </div>
      </div>

      {isLoading && <StateSizeSkeleton />}

      {error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load state size data: {error.message}</p>
        </Card>
      )}

      {chartData && latestData && delta && (
        <div className="space-y-6">
          {/* Stats Row: Total State Size + Metric Cards */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-12">
            {/* Total State Size */}
            <div className="flex shrink-0 flex-col justify-center">
              <p className="text-xs font-medium tracking-wider text-muted uppercase">Total State Size</p>
              <span className="mt-1 text-6xl font-bold text-foreground tabular-nums">
                {formatBytes(latestData.total_bytes)}
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className={clsx(
                    'flex items-center gap-1.5 rounded-sm px-2 py-1',
                    totalIsPositive ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                  )}
                >
                  <TotalIcon className="size-4" />
                  <span className="text-sm font-semibold tabular-nums">{formatDeltaBytes(delta.total.delta)}</span>
                </div>
                <span
                  className={clsx(
                    'text-sm font-medium tabular-nums',
                    totalIsPositive ? 'text-amber-400' : 'text-emerald-400'
                  )}
                >
                  {delta.total.percentChange >= 0 ? '+' : ''}
                  {delta.total.percentChange.toFixed(3)}%
                </span>
              </div>
            </div>

            {/* Metric Cards: Account Trie, Storage Tries, Contract Codes */}
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Account Trie */}
              <Card rounded className="p-3">
                <p className="text-xs font-medium tracking-wider text-muted uppercase">Account Trie</p>
                <p className="mt-0.5 text-2xl font-bold text-foreground tabular-nums">
                  {formatBytes(latestData.account_trienode_bytes)}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={clsx(
                      'rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums',
                      delta.accounts.bytes.delta >= 0
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    {formatDeltaBytes(delta.accounts.bytes.delta)}
                  </span>
                  <span
                    className={clsx(
                      'text-xs font-medium tabular-nums',
                      delta.accounts.bytes.delta >= 0 ? 'text-amber-400' : 'text-emerald-400'
                    )}
                  >
                    {delta.accounts.bytes.percentChange >= 0 ? '+' : ''}
                    {delta.accounts.bytes.percentChange.toFixed(3)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted tabular-nums">
                  Account Leaves: {latestData.accounts.toLocaleString()} ({formatBytes(latestData.account_bytes)})
                </p>
              </Card>

              {/* Storage Tries */}
              <Card rounded className="p-3">
                <p className="text-xs font-medium tracking-wider text-muted uppercase">Storage Tries</p>
                <p className="mt-0.5 text-2xl font-bold text-foreground tabular-nums">
                  {formatBytes(latestData.storage_trienode_bytes)}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={clsx(
                      'rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums',
                      delta.storage.bytes.delta >= 0
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    {formatDeltaBytes(delta.storage.bytes.delta)}
                  </span>
                  <span
                    className={clsx(
                      'text-xs font-medium tabular-nums',
                      delta.storage.bytes.delta >= 0 ? 'text-amber-400' : 'text-emerald-400'
                    )}
                  >
                    {delta.storage.bytes.percentChange >= 0 ? '+' : ''}
                    {delta.storage.bytes.percentChange.toFixed(3)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted tabular-nums">
                  Storage Leaves: {latestData.storages.toLocaleString()} ({formatBytes(latestData.storage_bytes)})
                </p>
              </Card>

              {/* Contract Codes */}
              <Card rounded className="p-3">
                <p className="text-xs font-medium tracking-wider text-muted uppercase">Contract Codes</p>
                <p className="mt-0.5 text-2xl font-bold text-foreground tabular-nums">
                  {formatBytes(latestData.contract_code_bytes)}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={clsx(
                      'rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums',
                      delta.contractCodes.bytes.delta >= 0
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    {formatDeltaBytes(delta.contractCodes.bytes.delta)}
                  </span>
                  <span
                    className={clsx(
                      'text-xs font-medium tabular-nums',
                      delta.contractCodes.bytes.delta >= 0 ? 'text-amber-400' : 'text-emerald-400'
                    )}
                  >
                    {delta.contractCodes.bytes.percentChange >= 0 ? '+' : ''}
                    {delta.contractCodes.bytes.percentChange.toFixed(3)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted tabular-nums">
                  Unique Bytecodes: {latestData.contract_codes.toLocaleString()}
                </p>
              </Card>
            </div>
          </div>

          {/* Main Chart */}
          <Card rounded className="p-6">
            <MultiLineChart
              title="Historical State Growth"
              subtitle="Daily snapshot of Ethereum state components (stacked)"
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
        </div>
      )}
    </Container>
  );
}
