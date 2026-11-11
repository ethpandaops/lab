import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ECHARTS_THEME } from '@/utils/echarts-theme';
import { CALL_BUCKETS, TRANSACTION_BUCKETS } from './constants';
import type { GasHistogramProps } from './GasHistogram.types';

/**
 * GasHistogram - Reusable histogram showing gas distribution
 *
 * Used for:
 * - BlockPage: Transactions by Gas Used
 * - TransactionPage: Call Size Distribution
 */
export function GasHistogram({
  title,
  subtitle,
  values,
  buckets,
  yAxisLabel = 'Count',
  tooltipLabel = 'items',
}: GasHistogramProps): JSX.Element {
  const colors = useThemeColors();

  // Determine which buckets to use
  const bucketDefs = useMemo(() => {
    if (buckets) return buckets;
    // Auto-detect based on value ranges
    const maxValue = Math.max(...values, 0);
    return maxValue > 50000 ? TRANSACTION_BUCKETS : CALL_BUCKETS;
  }, [buckets, values]);

  // Calculate histogram data
  const histogramData = useMemo(() => {
    if (!values.length) return { buckets: [], counts: [], maxCount: 0 };

    const counts = bucketDefs.map(bucket => {
      return values.filter(v => v >= bucket.min && v < bucket.max).length;
    });

    // Filter out empty trailing buckets
    let lastNonZero = counts.length - 1;
    while (lastNonZero > 0 && counts[lastNonZero] === 0) {
      lastNonZero--;
    }

    const trimmedBuckets = bucketDefs.slice(0, lastNonZero + 1).map(b => b.label);
    const trimmedCounts = counts.slice(0, lastNonZero + 1);

    return {
      buckets: trimmedBuckets,
      counts: trimmedCounts,
      maxCount: Math.max(...trimmedCounts, 0),
    };
  }, [values, bucketDefs]);

  // Chart option
  const chartOption = useMemo(() => {
    if (!histogramData.buckets.length) return {};

    const totalCount = histogramData.counts.reduce((sum, c) => sum + c, 0);

    return {
      grid: { left: 50, right: 20, top: 16, bottom: 50 },
      xAxis: {
        type: 'category',
        data: histogramData.buckets,
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: {
          color: colors.muted,
          fontSize: 10,
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'center',
        nameGap: 35,
        nameTextStyle: { color: colors.muted, fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: { color: colors.muted },
      },
      series: [
        {
          type: 'bar',
          data: histogramData.counts,
          itemStyle: {
            color: colors.primary,
            borderRadius: [2, 2, 0, 0],
          },
          barMaxWidth: 40,
        },
      ],
      tooltip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number }) => {
          const pct = totalCount > 0 ? ((params.value / totalCount) * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>${params.value} ${tooltipLabel} (${pct}%)`;
        },
      },
    };
  }, [histogramData, colors, yAxisLabel, tooltipLabel]);

  return (
    <PopoutCard title={title} subtitle={subtitle}>
      {({ inModal }) =>
        histogramData.buckets.length > 0 ? (
          <ReactECharts theme={ECHARTS_THEME} option={chartOption} style={{ height: inModal ? 400 : 280 }} />
        ) : (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: inModal ? 400 : 280 }}>
            No data
          </div>
        )
      }
    </PopoutCard>
  );
}
