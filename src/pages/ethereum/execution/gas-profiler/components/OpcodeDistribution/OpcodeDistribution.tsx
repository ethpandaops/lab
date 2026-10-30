import { type JSX, useMemo, useState } from 'react';
import { BarChart } from '@/components/Charts/Bar';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Card } from '@/components/Layout/Card';
import { useThemeColors } from '@/hooks/useThemeColors';
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

const SORT_OPTIONS = [
  { value: 'gas', label: 'By Gas' },
  { value: 'count', label: 'By Count' },
] as const;

/**
 * Horizontal bar chart showing opcode gas distribution
 */
export function OpcodeDistribution({ opcodeStats, maxOpcodes = 15 }: OpcodeDistributionProps): JSX.Element {
  const themeColors = useThemeColors();
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
      <Card title="Opcode Distribution">
        <div className="flex h-[200px] items-center justify-center text-sm text-muted">No opcode data available</div>
      </Card>
    );
  }

  const totalGas = opcodeStats.reduce((sum, s) => sum + s.totalGas, 0);
  const totalCount = opcodeStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card
      title="Opcode Distribution"
      actions={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Total:</span>
            <span className="font-medium text-foreground">{formatGas(totalGas)} gas</span>
            <span className="text-muted">|</span>
            <span className="font-medium text-foreground">{totalCount.toLocaleString()} ops</span>
          </div>
          <SegmentedControl
            ariaLabel="Sort opcodes by"
            options={SORT_OPTIONS}
            value={sortMode}
            onChange={setSortMode}
          />
        </div>
      }
    >
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
            ${stat.errorCount > 0 ? `<div style="color: ${themeColors.danger};">Errors: ${stat.errorCount}</div>` : ''}
          `;
        }}
      />
    </Card>
  );
}
