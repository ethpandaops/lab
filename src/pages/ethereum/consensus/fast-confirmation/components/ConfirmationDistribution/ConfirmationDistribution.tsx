import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { hexToRgba } from '@/utils/color';
import { formatDurationMs, logHistogram } from '../../fast-confirmation.utils';

const MIN_SECONDS = 5;
const MAX_SECONDS = 1800;
const BINS = 72;

export interface ConfirmationDistributionProps {
  fastConfirmedMs: number[];
  finalizedMs: number[];
  subtitle: string;
}

function tickLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

/**
 * Log-scale histogram of time to fast confirmation against time to finality.
 */
export function ConfirmationDistribution({
  fastConfirmedMs,
  finalizedMs,
  subtitle,
}: ConfirmationDistributionProps): JSX.Element {
  const colors = useThemeColors();

  const option = useMemo(() => {
    const fast = logHistogram(fastConfirmedMs, MIN_SECONDS, MAX_SECONDS, BINS);
    const final = logHistogram(finalizedMs, MIN_SECONDS, MAX_SECONDS, BINS);
    const fastTotal = fastConfirmedMs.length || 1;
    const finalTotal = finalizedMs.length || 1;
    const toShare = (count: number, total: number): number => (count / total) * 100;

    const series = (name: string, color: string, data: Array<[number, number]>): Record<string, unknown> => ({
      name,
      type: 'line',
      smooth: 0.35,
      symbol: 'none',
      data,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: hexToRgba(color, 0.4) },
            { offset: 1, color: hexToRgba(color, 0.02) },
          ],
        },
      },
    });

    return {
      grid: { left: 60, right: 24, top: 40, bottom: 50 },
      legend: {
        top: 0,
        textStyle: { color: colors.muted },
        data: ['Fast confirmation', 'Finality'],
      },
      xAxis: {
        type: 'log',
        logBase: 10,
        min: MIN_SECONDS,
        max: MAX_SECONDS,
        name: 'Time since slot start',
        nameLocation: 'center',
        nameGap: 30,
        nameTextStyle: { color: colors.muted },
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: { color: colors.muted, formatter: (value: number) => tickLabel(value) },
      },
      yAxis: {
        type: 'value',
        name: 'Share of blocks (%)',
        nameLocation: 'center',
        nameGap: 40,
        nameTextStyle: { color: colors.muted },
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: { color: colors.muted },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: Array<{ seriesName: string; value: [number, number]; color: string }>) => {
          if (!params.length) return '';
          const header = `<strong>${formatDurationMs(params[0].value[0] * 1000)}</strong>`;
          const rows = params
            .filter(p => p.value[1] > 0)
            .map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${p.value[1].toFixed(1)}%`);
          return [header, ...rows].join('<br/>');
        },
      },
      series: [
        {
          ...series(
            'Fast confirmation',
            colors.success,
            fast.map(b => [b.center, toShare(b.count, fastTotal)])
          ),
          markLine: {
            silent: true,
            symbol: 'none',
            label: { color: colors.muted, formatter: '{b}', position: 'insideEndTop' },
            lineStyle: { color: colors.border, type: 'dashed' },
            data: [
              { name: '1 slot', xAxis: 12 },
              { name: '2 epochs', xAxis: 768 },
            ],
          },
        },
        series(
          'Finality',
          colors.primary,
          final.map(b => [b.center, toShare(b.count, finalTotal)])
        ),
      ],
    };
  }, [colors, fastConfirmedMs, finalizedMs]);

  return (
    <PopoutCard title="Two clocks" subtitle={subtitle} anchorId="confirmation-distribution" modalSize="full">
      {({ inModal }) =>
        fastConfirmedMs.length > 0 ? (
          <ReactECharts option={option} style={{ height: inModal ? 560 : 320 }} notMerge />
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-muted">No data</div>
        )
      }
    </PopoutCard>
  );
}
