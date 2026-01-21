import { type JSX, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Data item for the pie chart
 */
export interface CategoryPieChartItem {
  name: string;
  value: number;
}

export interface CategoryPieChartProps {
  /** Chart data items */
  data: CategoryPieChartItem[];
  /** Color mapping for categories */
  colorMap: Record<string, string>;
  /** Chart title */
  title: string;
  /** Chart subtitle/description */
  subtitle: string;
  /** Total label displayed in header (e.g., "123K total") */
  totalLabel?: string;
  /** Label for percentage in tooltip (e.g., "of EVM gas", "of self gas") */
  percentLabel?: string;
  /** Chart height in pixels */
  height?: number;
  /** Whether data is loading */
  loading?: boolean;
  /** Message to show when no data */
  emptyMessage?: string;
  /** Inner radius percentage (default: 40) */
  innerRadius?: number;
  /** Outer radius percentage (default: 70) */
  outerRadius?: number;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * CategoryPieChart - Generic donut/pie chart for category breakdowns
 *
 * Used for:
 * - Gas by Opcode Category (CallPage, TransactionPage)
 * - Call Type Distribution (TransactionPage)
 */
export function CategoryPieChart({
  data,
  colorMap,
  title,
  subtitle,
  totalLabel,
  percentLabel = 'of total',
  height = 220,
  loading = false,
  emptyMessage = 'No data available',
  innerRadius = 40,
  outerRadius = 70,
}: CategoryPieChartProps): JSX.Element {
  const colors = useThemeColors();

  const chartOption = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    return {
      series: [
        {
          type: 'pie',
          radius: [`${innerRadius}%`, `${outerRadius}%`],
          center: ['50%', '50%'],
          data: data.map(d => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: colorMap[d.name] ?? colors.muted },
          })),
          label: {
            show: true,
            color: colors.foreground,
            formatter: (params: { name: string; percent: number }) => `${params.name}\n${params.percent.toFixed(1)}%`,
            fontSize: 10,
          },
          labelLine: { lineStyle: { color: colors.border } },
        },
      ],
      tooltip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number }) => {
          const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>Value: ${formatGas(params.value)}<br/>${pct}% ${percentLabel}`;
        },
      },
    };
  }, [data, colorMap, colors, innerRadius, outerRadius, percentLabel]);

  const titleWithTotal = totalLabel ? `${title}` : title;
  const subtitleWithTotal = totalLabel ? `${subtitle} · ${totalLabel}` : subtitle;

  return (
    <PopoutCard title={titleWithTotal} subtitle={subtitleWithTotal}>
      {({ inModal }) => {
        const chartHeight = inModal ? 400 : height;
        return loading ? (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: chartHeight }}>
            Loading...
          </div>
        ) : data.length > 0 ? (
          <ReactECharts option={chartOption} style={{ height: chartHeight }} />
        ) : (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: chartHeight }}>
            {emptyMessage}
          </div>
        );
      }}
    </PopoutCard>
  );
}
