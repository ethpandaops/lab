import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Bucket definition for histogram
 */
export interface HistogramBucket {
  label: string;
  min: number;
  max: number;
}

export interface GasHistogramProps {
  /** Title for the card */
  title: string;
  /** Subtitle for the card */
  subtitle: string;
  /** Array of gas values to bucket */
  values: number[];
  /** Custom bucket definitions (optional - uses defaults if not provided) */
  buckets?: HistogramBucket[];
  /** Y-axis label (default: "Count") */
  yAxisLabel?: string;
  /** Tooltip item label (default: "items") */
  tooltipLabel?: string;
}

/**
 * Default buckets for transaction-level gas (larger ranges)
 */
const TRANSACTION_BUCKETS: HistogramBucket[] = [
  { label: '21K-50K', min: 21000, max: 50000 },
  { label: '50K-100K', min: 50000, max: 100000 },
  { label: '100K-250K', min: 100000, max: 250000 },
  { label: '250K-500K', min: 250000, max: 500000 },
  { label: '500K-1M', min: 500000, max: 1000000 },
  { label: '1M-5M', min: 1000000, max: 5000000 },
  { label: '5M+', min: 5000000, max: Infinity },
];

/**
 * Default buckets for call-level gas (smaller ranges)
 */
const CALL_BUCKETS: HistogramBucket[] = [
  { label: '0-1K', min: 0, max: 1000 },
  { label: '1K-5K', min: 1000, max: 5000 },
  { label: '5K-20K', min: 5000, max: 20000 },
  { label: '20K-50K', min: 20000, max: 50000 },
  { label: '50K-100K', min: 50000, max: 100000 },
  { label: '100K-500K', min: 100000, max: 500000 },
  { label: '500K+', min: 500000, max: Infinity },
];

/**
 * GasHistogram - Reusable histogram showing gas distribution
 *
 * Used for:
 * - BlockPage: Transaction Size Distribution
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
          <ReactECharts option={chartOption} style={{ height: inModal ? 400 : 280 }} />
        ) : (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: inModal ? 400 : 280 }}>
            No data
          </div>
        )
      }
    </PopoutCard>
  );
}

// Export bucket presets for convenience
export { TRANSACTION_BUCKETS, CALL_BUCKETS };
