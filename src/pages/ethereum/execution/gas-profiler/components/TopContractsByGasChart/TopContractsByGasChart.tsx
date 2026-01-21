import { type JSX, useMemo } from 'react';
import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';

/**
 * Contract data for the chart
 */
export interface ContractGasItem {
  address: string;
  name: string | null;
  gas: number;
}

export interface TopContractsByGasChartProps {
  /** Array of contracts with gas data, should be pre-sorted by gas descending */
  contracts: ContractGasItem[];
  /** Total gas for percentage calculation */
  totalGas: number;
  /** Maximum number of contracts to show (default: 10) */
  maxContracts?: number;
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
 * TopContractsByGasChart - Horizontal bar chart showing top contracts by gas consumption
 *
 * Used on:
 * - BlockPage: Shows top contracts across all transactions in a block
 * - TransactionPage: Shows top contracts within a single transaction
 */
export function TopContractsByGasChart({
  contracts,
  totalGas,
  maxContracts = 10,
}: TopContractsByGasChartProps): JSX.Element {
  // Prepare chart data - reverse for horizontal bar chart (highest at top)
  const chartData = useMemo(() => {
    const topContracts = contracts.slice(0, maxContracts);
    const labels = topContracts.map(c => c.name || `${c.address.slice(0, 6)}...${c.address.slice(-4)}`).reverse();
    const values = topContracts.map(c => c.gas).reverse();
    return { labels, values };
  }, [contracts, maxContracts]);

  return (
    <PopoutCard title="Top Contracts by Gas" subtitle="Which contracts consumed the most gas?">
      {({ inModal }) =>
        chartData.labels.length > 0 ? (
          <BarChart
            data={chartData.values}
            labels={chartData.labels}
            orientation="horizontal"
            height={Math.max(inModal ? 400 : 200, chartData.labels.length * 28)}
            showLabel={false}
            barWidth="60%"
            valueAxisLabelFormatter={formatCompact}
            tooltipFormatter={(params: unknown) => {
              const p = params as { name: string; value: number }[];
              if (!p || !p[0]) return '';
              const pct = totalGas > 0 ? ((p[0].value / totalGas) * 100).toFixed(1) : '0';
              return `<strong>${p[0].name}</strong><br/>${formatGas(p[0].value)} gas (${pct}%)`;
            }}
          />
        ) : (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: inModal ? 400 : 200 }}>
            No contract data
          </div>
        )
      }
    </PopoutCard>
  );
}
