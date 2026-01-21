import { type JSX, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Data point for the scatter chart
 */
export interface CallsVsGasDataPoint {
  /** Number of call frames */
  calls: number;
  /** Gas used */
  gas: number;
}

export interface CallsVsGasChartProps {
  /** Array of data points (transactions or call frames) */
  data: CallsVsGasDataPoint[];
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Format large numbers with K/M suffix
 */
function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/**
 * CallsVsGasChart - Scatter plot showing relationship between call count and gas usage
 *
 * Used on:
 * - BlockPage: Shows calls vs gas for all transactions in a block
 * - TransactionPage: Shows calls vs gas for contracts within a transaction
 */
export function CallsVsGasChart({ data }: CallsVsGasChartProps): JSX.Element {
  const colors = useThemeColors();
  const [useLogScale, setUseLogScale] = useState(true);

  const chartOption = useMemo(() => {
    if (!data.length) return {};

    // Filter out data points with 0 calls when using log scale
    const scatterData = useLogScale
      ? data.filter(d => d.calls > 0 && d.gas > 0).map(d => [d.calls, d.gas])
      : data.map(d => [d.calls, d.gas]);

    return {
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: useLogScale ? 'log' : 'value',
        name: useLogScale ? 'Calls (log)' : 'Calls',
        nameLocation: 'center',
        nameGap: 25,
        nameTextStyle: { color: colors.muted, fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: { color: colors.muted },
        ...(useLogScale ? { min: 1 } : {}),
      },
      yAxis: {
        type: useLogScale ? 'log' : 'value',
        name: useLogScale ? 'Gas Used (log)' : 'Gas Used',
        nameLocation: 'center',
        nameGap: 50,
        nameTextStyle: { color: colors.muted, fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: {
          color: colors.muted,
          formatter: (value: number) => formatCompact(value),
        },
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: 8,
          itemStyle: {
            color: colors.primary,
            opacity: 0.6,
          },
        },
      ],
      tooltip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { value: [number, number] }) => {
          const [calls, gas] = params.value;
          return `<strong>${calls}</strong> calls<br/><strong>${formatGas(gas)}</strong> gas used`;
        },
      },
    };
  }, [data, colors, useLogScale]);

  return (
    <PopoutCard title="Calls vs Gas" subtitle="Do more contract calls use more gas?">
      {({ inModal }) =>
        data.length > 0 ? (
          <div>
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setUseLogScale(!useLogScale)}
                className={clsx(
                  'rounded-xs px-2 py-1 text-xs transition-colors',
                  useLogScale ? 'bg-primary/10 text-primary' : 'bg-surface text-muted hover:text-foreground'
                )}
              >
                Log Scale {useLogScale ? 'On' : 'Off'}
              </button>
            </div>
            <ReactECharts option={chartOption} style={{ height: inModal ? 380 : 260 }} />
          </div>
        ) : (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: inModal ? 400 : 280 }}>
            No data
          </div>
        )
      }
    </PopoutCard>
  );
}
