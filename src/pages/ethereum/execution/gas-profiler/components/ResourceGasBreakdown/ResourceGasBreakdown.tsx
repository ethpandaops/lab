import { type JSX } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Card } from '@/components/Layout/Card';
import { BarChart } from '@/components/Charts/Bar';
import type { ResourceGasEntry } from '../../utils/resourceGas';
import { RESOURCE_COLORS } from '../../utils/resourceGas';

export interface ResourceGasBreakdownProps {
  /** Resource gas entries sorted by gas desc */
  entries: ResourceGasEntry[];
  /** Gas refund amount (shown as footnote when > 0) */
  refund?: number;
  /** Total resource gas for percentage calculations */
  total?: number;
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Whether data is loading */
  loading?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Format gas value compactly for bar labels (e.g. 57.3M, 850K)
 */
function formatGasCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * Resource gas breakdown using a horizontal bar chart.
 * Uses the core BarChart component for an honest, readable visualization
 * that handles extreme skew naturally.
 */
export function ResourceGasBreakdown({
  entries,
  refund = 0,
  total: totalProp,
  title = 'Resource Gas Breakdown',
  subtitle = 'What system resources did gas pay for?',
  loading = false,
  className,
}: ResourceGasBreakdownProps): JSX.Element {
  const total = totalProp ?? entries.reduce((sum, e) => sum + e.gas, 0);

  if (loading) {
    return (
      <Card className={className}>
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <div className="px-4 pb-4">
          <div className="h-48 animate-pulse rounded-sm bg-surface" />
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <div className="px-4 pb-4 text-center text-sm text-muted">No resource gas data available</div>
      </Card>
    );
  }

  // Reverse entries so largest is at top (ECharts horizontal bar renders bottom-up)
  const reversed = [...entries].reverse();

  const barData = reversed.map(entry => ({
    value: entry.gas,
    color: entry.color,
  }));

  const labels = reversed.map(entry => entry.category);

  // Dynamic height: 36px per bar + 60px for axis/padding
  const chartHeight = entries.length * 36 + 60;

  return (
    <PopoutCard title={title} subtitle={subtitle} className={className}>
      {() => (
        <div className="px-4 pb-4">
          {/* Total gas header */}
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs text-muted">Total resource gas</span>
            <span className="font-mono text-sm font-medium text-foreground">{formatGas(total)}</span>
          </div>

          {/* Horizontal bar chart */}
          <BarChart
            data={barData}
            labels={labels}
            orientation="horizontal"
            height={chartHeight}
            showLabel={true}
            labelPosition="right"
            labelFormatter={(params: { value: number }) => formatGasCompact(params.value)}
            barWidth="65%"
            tooltipFormatter={params => {
              const p = Array.isArray(params) ? params[0] : params;
              const val = typeof p.value === 'number' ? p.value : 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              return `<strong>${p.name as string}</strong><br/>${formatGas(val)} gas (${pct}%)`;
            }}
            categoryLabelInterval={0}
            valueAxisLabelFormatter={(v: number) => formatGasCompact(v)}
          />

          {/* Refund footnote */}
          {refund > 0 && (
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: RESOURCE_COLORS.Refund }} />
                <span className="text-xs font-medium text-foreground">Refund</span>
              </div>
              <span className="font-mono text-xs text-success">-{formatGas(refund)}</span>
            </div>
          )}
        </div>
      )}
    </PopoutCard>
  );
}
