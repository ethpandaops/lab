import { type JSX, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { CATEGORY_COLORS, getOpcodeCategory } from '@/pages/ethereum/execution/gas-profiler/utils';
import { getDataVizColors } from '@/utils/dataVizColors';

const { DATA_COLORS } = getDataVizColors();

/**
 * Opcode stats type
 */
interface OpcodeStats {
  opcode: string;
  count: number;
  totalGas: number;
  percentage?: number;
  errorCount?: number;
}

export interface OpcodeAnalysisProps {
  /** Opcode statistics to display */
  opcodeStats: OpcodeStats[];
  /** Maximum number of opcodes to show in charts */
  maxOpcodes?: number;
  /** Whether to show the bar charts (default: true) */
  showCharts?: boolean;
  /** Whether to show the heatmap visualization (default: false) */
  showHeatmap?: boolean;
}

function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Opcode distribution chart by gas consumption
 */
function OpcodeByGasChart({
  opcodeStats,
  maxOpcodes,
  minHeight = 280,
}: {
  opcodeStats: OpcodeStats[];
  maxOpcodes: number;
  minHeight?: number;
}): JSX.Element {
  const sortedStats = useMemo(() => {
    return [...opcodeStats].sort((a, b) => b.totalGas - a.totalGas).slice(0, maxOpcodes);
  }, [opcodeStats, maxOpcodes]);

  const chartData = useMemo(() => {
    const reversed = [...sortedStats].reverse();
    return reversed.map(stat => ({
      value: stat.totalGas,
      color: CATEGORY_COLORS[getOpcodeCategory(stat.opcode)] ?? CATEGORY_COLORS.Other ?? DATA_COLORS.slate,
    }));
  }, [sortedStats]);

  const labels = useMemo(() => {
    return [...sortedStats].reverse().map(stat => stat.opcode);
  }, [sortedStats]);

  const totalGas = opcodeStats.reduce((sum, s) => sum + s.totalGas, 0);

  return (
    <BarChart
      data={chartData}
      labels={labels}
      orientation="horizontal"
      height={Math.max(minHeight, sortedStats.length * 22)}
      showLabel
      labelFormatter={(params: { value: number }) => {
        const pct = totalGas > 0 ? (params.value / totalGas) * 100 : 0;
        return `${pct.toFixed(1)}%`;
      }}
      barWidth="70%"
      axisName="Gas"
      tooltipFormatter={(params: unknown) => {
        const p = params as { name: string; value: number }[];
        if (!p || !p[0]) return '';
        const { name } = p[0];
        const stat = opcodeStats.find(s => s.opcode === name);
        if (!stat) return '';
        const pct = totalGas > 0 ? ((stat.totalGas / totalGas) * 100).toFixed(1) : '0';
        return `
          <div style="font-family: monospace; font-weight: 600;">${stat.opcode}</div>
          <div style="margin-top: 4px;">
            <span>Gas: </span><strong>${formatGas(stat.totalGas)}</strong> (${pct}%)
          </div>
        `;
      }}
    />
  );
}

/**
 * Opcode distribution chart by execution count
 */
function OpcodeByCountChart({
  opcodeStats,
  maxOpcodes,
  minHeight = 280,
}: {
  opcodeStats: OpcodeStats[];
  maxOpcodes: number;
  minHeight?: number;
}): JSX.Element {
  const sortedStats = useMemo(() => {
    return [...opcodeStats].sort((a, b) => b.count - a.count).slice(0, maxOpcodes);
  }, [opcodeStats, maxOpcodes]);

  const chartData = useMemo(() => {
    const reversed = [...sortedStats].reverse();
    return reversed.map(stat => ({
      value: stat.count,
      color: CATEGORY_COLORS[getOpcodeCategory(stat.opcode)] ?? CATEGORY_COLORS.Other ?? DATA_COLORS.slate,
    }));
  }, [sortedStats]);

  const labels = useMemo(() => {
    return [...sortedStats].reverse().map(stat => stat.opcode);
  }, [sortedStats]);

  const totalCount = opcodeStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <BarChart
      data={chartData}
      labels={labels}
      orientation="horizontal"
      height={Math.max(minHeight, sortedStats.length * 22)}
      showLabel
      labelFormatter={(params: { value: number }) => {
        const pct = totalCount > 0 ? (params.value / totalCount) * 100 : 0;
        return `${pct.toFixed(1)}%`;
      }}
      barWidth="70%"
      axisName="Executions"
      tooltipFormatter={(params: unknown) => {
        const p = params as { name: string; value: number }[];
        if (!p || !p[0]) return '';
        const { name } = p[0];
        const stat = opcodeStats.find(s => s.opcode === name);
        if (!stat) return '';
        const pct = totalCount > 0 ? ((stat.count / totalCount) * 100).toFixed(1) : '0';
        return `
          <div style="font-family: monospace; font-weight: 600;">${stat.opcode}</div>
          <div style="margin-top: 4px;">
            <span>Count: </span><strong>${stat.count.toLocaleString()}</strong> (${pct}%)
          </div>
        `;
      }}
    />
  );
}

/**
 * Opcode heatmap - opcodes grouped by category, single row showing gas intensity
 */
function OpcodeHeatmapChart({ opcodeStats }: { opcodeStats: OpcodeStats[] }): JSX.Element {
  const [hoveredOpcode, setHoveredOpcode] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Update tooltip position when hovered opcode changes
  useEffect(() => {
    if (hoveredOpcode && cellRefs.current.has(hoveredOpcode)) {
      const cell = cellRefs.current.get(hoveredOpcode)!;
      const rect = cell.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [hoveredOpcode]);

  const setCellRef = useCallback((opcode: string, el: HTMLDivElement | null) => {
    if (el) {
      cellRefs.current.set(opcode, el);
    } else {
      cellRefs.current.delete(opcode);
    }
  }, []);

  // Group opcodes by category and calculate totals
  const { categoryGroups, maxGas, totalGas } = useMemo(() => {
    const categoryMap = new Map<string, { opcode: string; gas: number; count: number }[]>();

    for (const stat of opcodeStats) {
      const category = getOpcodeCategory(stat.opcode);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push({
        opcode: stat.opcode,
        gas: stat.totalGas,
        count: stat.count,
      });
    }

    // Sort categories by total gas descending
    const groups = [...categoryMap.entries()]
      .map(([category, opcodes]) => ({
        category,
        opcodes: opcodes.sort((a, b) => b.gas - a.gas), // Sort opcodes by gas within category
        totalGas: opcodes.reduce((sum, o) => sum + o.gas, 0),
      }))
      .sort((a, b) => b.totalGas - a.totalGas);

    const maxGas = Math.max(...opcodeStats.map(s => s.totalGas));
    const totalGas = opcodeStats.reduce((sum, s) => sum + s.totalGas, 0);

    return { categoryGroups: groups, maxGas, totalGas };
  }, [opcodeStats]);

  if (categoryGroups.length === 0) return <div className="text-center text-muted">No data</div>;

  // Calculate color intensity (using indigo gradient like the HeatmapChart)
  const getColorIntensity = (gas: number): string => {
    const ratio = maxGas > 0 ? gas / maxGas : 0;
    // Indigo gradient: light to dark
    if (ratio === 0) return 'bg-data-indigo-5';
    if (ratio < 0.1) return 'bg-data-indigo-15';
    if (ratio < 0.25) return 'bg-data-indigo-25';
    if (ratio < 0.4) return 'bg-data-indigo-40';
    if (ratio < 0.55) return 'bg-data-indigo-55';
    if (ratio < 0.7) return 'bg-data-indigo-70';
    if (ratio < 0.85) return 'bg-data-indigo-85';
    return 'bg-data-indigo';
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Low</span>
          <div className="flex gap-px">
            <div className="size-3 bg-data-indigo-15" />
            <div className="size-3 bg-data-indigo-25" />
            <div className="size-3 bg-data-indigo-40" />
            <div className="size-3 bg-data-indigo-55" />
            <div className="size-3 bg-data-indigo-70" />
            <div className="size-3 bg-data-indigo-85" />
            <div className="size-3 bg-data-indigo" />
          </div>
          <span>High</span>
        </div>
        <div className="text-xs text-muted">{opcodeStats.length} opcodes</div>
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-4 overflow-x-auto">
        {categoryGroups.map(({ category, opcodes }) => (
          <div key={category} className="shrink-0">
            {/* Category header */}
            <div
              className="mb-2 truncate text-center text-xs font-medium"
              style={{ color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other }}
            >
              {category}
            </div>

            {/* Opcode cells */}
            <div className="flex gap-px">
              {opcodes.map(({ opcode, gas }) => {
                const isHovered = hoveredOpcode === opcode;

                return (
                  <div key={opcode} className="flex flex-col items-center">
                    {/* Cell */}
                    <div
                      ref={el => setCellRef(opcode, el)}
                      className={`size-6 cursor-pointer transition-all ${getColorIntensity(gas)} ${isHovered ? 'ring-2 ring-foreground' : ''}`}
                      onMouseEnter={() => setHoveredOpcode(opcode)}
                      onMouseLeave={() => setHoveredOpcode(null)}
                    />

                    {/* Opcode label (vertical using writing-mode) */}
                    <div
                      className="mt-1 font-mono text-2xs whitespace-nowrap text-muted"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {opcode}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip via portal */}
      {hoveredOpcode &&
        (() => {
          const stat = opcodeStats.find(s => s.opcode === hoveredOpcode);
          if (!stat) return null;
          const pct = totalGas > 0 ? ((stat.totalGas / totalGas) * 100).toFixed(1) : '0';
          const category = getOpcodeCategory(hoveredOpcode);

          return createPortal(
            <div
              className="pointer-events-none fixed z-9999 -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background px-3 py-2 text-xs whitespace-nowrap"
              style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            >
              <div className="font-mono font-semibold">{hoveredOpcode}</div>
              <div className="mt-1 text-muted" style={{ color: CATEGORY_COLORS[category] }}>
                {category}
              </div>
              <div className="mt-1">
                <strong>{formatGas(stat.totalGas)}</strong> gas ({pct}%)
              </div>
              <div className="text-muted">{stat.count.toLocaleString()} executions</div>
              {/* Arrow */}
              <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
            </div>,
            document.body
          );
        })()}
    </div>
  );
}

/**
 * OpcodeAnalysis - Combined charts and table for opcode distribution
 *
 * Displays:
 * - Two bar charts side by side (by gas and by count)
 */
export function OpcodeAnalysis({
  opcodeStats,
  maxOpcodes = 15,
  showCharts = true,
  showHeatmap = false,
}: OpcodeAnalysisProps): JSX.Element {
  if (opcodeStats.length === 0) {
    return (
      <div className="rounded-sm border border-border p-8 text-center text-sm text-muted">No opcode data available</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two charts side by side */}
      {showCharts && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PopoutCard title="Opcodes by Gas">
            {({ inModal }) => (
              <OpcodeByGasChart opcodeStats={opcodeStats} maxOpcodes={maxOpcodes} minHeight={inModal ? 400 : 280} />
            )}
          </PopoutCard>

          <PopoutCard title="Opcodes by Count">
            {({ inModal }) => (
              <OpcodeByCountChart opcodeStats={opcodeStats} maxOpcodes={maxOpcodes} minHeight={inModal ? 400 : 280} />
            )}
          </PopoutCard>
        </div>
      )}

      {/* Heatmap - full width */}
      {showHeatmap && (
        <PopoutCard title="Opcode Heatmap" subtitle="Gas consumption by category and opcode" allowContentOverflow>
          {() => <OpcodeHeatmapChart opcodeStats={opcodeStats} />}
        </PopoutCard>
      )}
    </div>
  );
}
