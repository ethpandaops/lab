import { type JSX, useMemo, useState } from 'react';
import { BarChart } from '@/components/Charts/Bar';
import { Card } from '@/components/Layout/Card';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { OpcodeStats } from '../../IndexPage.types';

const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

export interface OpcodeDistributionProps {
  /** Opcode statistics to display */
  opcodeStats: OpcodeStats[];
  /** Maximum number of opcodes to show */
  maxOpcodes?: number;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

type SortMode = 'gas' | 'count';

/**
 * Horizontal bar chart showing opcode gas distribution
 */
export function OpcodeDistribution({ opcodeStats, maxOpcodes = 15 }: OpcodeDistributionProps): JSX.Element {
  const [sortMode, setSortMode] = useState<SortMode>('gas');

  const sortedStats = useMemo(() => {
    const sorted = [...opcodeStats].sort((a, b) => {
      if (sortMode === 'gas') return b.totalGas - a.totalGas;
      return b.count - a.count;
    });
    return sorted.slice(0, maxOpcodes);
  }, [opcodeStats, sortMode, maxOpcodes]);

  const chartData = useMemo(() => {
    // Reverse for horizontal bar chart (bottom to top)
    const reversed = [...sortedStats].reverse();
    return reversed.map((stat, index) => ({
      value: sortMode === 'gas' ? stat.totalGas : stat.count,
      color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
    }));
  }, [sortedStats, sortMode]);

  const labels = useMemo(() => {
    return [...sortedStats].reverse().map(stat => stat.opcode);
  }, [sortedStats]);

  if (opcodeStats.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">Opcode Distribution</h3>
        <div className="flex h-[200px] items-center justify-center text-sm text-muted">No opcode data available</div>
      </Card>
    );
  }

  const totalGas = opcodeStats.reduce((sum, s) => sum + s.totalGas, 0);
  const totalCount = opcodeStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Opcode Distribution</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Total:</span>
            <span className="font-medium text-foreground">{formatGas(totalGas)} gas</span>
            <span className="text-muted">|</span>
            <span className="font-medium text-foreground">{totalCount.toLocaleString()} ops</span>
          </div>
          <div className="flex rounded-xs bg-background p-0.5">
            <button
              onClick={() => setSortMode('gas')}
              className={`rounded-xs px-2 py-1 text-xs font-medium transition-colors ${
                sortMode === 'gas' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              By Gas
            </button>
            <button
              onClick={() => setSortMode('count')}
              className={`rounded-xs px-2 py-1 text-xs font-medium transition-colors ${
                sortMode === 'count' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              By Count
            </button>
          </div>
        </div>
      </div>

      <BarChart
        data={chartData}
        labels={labels}
        orientation="horizontal"
        height={Math.max(300, sortedStats.length * 28)}
        showLabel={false}
        barWidth="70%"
        tooltipFormatter={(params: unknown) => {
          const p = params as { name: string; value: number }[];
          if (!p || !p[0]) return '';
          const stat = opcodeStats.find(s => s.opcode === p[0].name);
          if (!stat) return '';
          return `
            <div style="font-family: monospace; font-weight: 600;">${stat.opcode}</div>
            <div style="margin-top: 4px;">
              <span>Gas: </span><strong>${formatGas(stat.totalGas)}</strong> (${stat.percentage.toFixed(1)}%)
            </div>
            <div>
              <span>Count: </span><strong>${stat.count.toLocaleString()}</strong>
            </div>
            ${stat.errorCount > 0 ? `<div style="color: #ef4444;">Errors: ${stat.errorCount}</div>` : ''}
          `;
        }}
      />
    </Card>
  );
}
