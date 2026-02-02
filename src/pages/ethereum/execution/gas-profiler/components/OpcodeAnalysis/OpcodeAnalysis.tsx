import { type JSX, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { CATEGORY_COLORS, getOpcodeCategory } from '../../utils';

/**
 * Opcode stats type
 */
export interface OpcodeStats {
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
  /** Whether to show internal section headers (default: true) */
  showHeader?: boolean;
  /** Whether to show the bar charts (default: true) */
  showCharts?: boolean;
  /** Whether to show the table (default: true) */
  showTable?: boolean;
  /** Whether to show the heatmap visualization (default: false) */
  showHeatmap?: boolean;
}

function formatGas(value: number): string {
  return value.toLocaleString();
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
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
      color: CATEGORY_COLORS[getOpcodeCategory(stat.opcode)] ?? CATEGORY_COLORS.Other ?? '#9ca3af',
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
      valueAxisLabelFormatter={formatCompact}
      tooltipFormatter={(params: unknown) => {
        const p = params as { name: string; value: number }[];
        if (!p || !p[0]) return '';
        const stat = opcodeStats.find(s => s.opcode === p[0].name);
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
      color: CATEGORY_COLORS[getOpcodeCategory(stat.opcode)] ?? CATEGORY_COLORS.Other ?? '#9ca3af',
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
      valueAxisLabelFormatter={formatCompact}
      tooltipFormatter={(params: unknown) => {
        const p = params as { name: string; value: number }[];
        if (!p || !p[0]) return '';
        const stat = opcodeStats.find(s => s.opcode === p[0].name);
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
    if (ratio === 0) return 'bg-indigo-50 dark:bg-indigo-950/30';
    if (ratio < 0.1) return 'bg-indigo-100 dark:bg-indigo-900/40';
    if (ratio < 0.25) return 'bg-indigo-200 dark:bg-indigo-800/50';
    if (ratio < 0.4) return 'bg-indigo-300 dark:bg-indigo-700/60';
    if (ratio < 0.55) return 'bg-indigo-400 dark:bg-indigo-600/70';
    if (ratio < 0.7) return 'bg-indigo-500 dark:bg-indigo-500';
    if (ratio < 0.85) return 'bg-indigo-600 dark:bg-indigo-400';
    return 'bg-indigo-700 dark:bg-indigo-300';
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Low</span>
          <div className="flex gap-px">
            <div className="size-3 bg-indigo-100 dark:bg-indigo-900/40" />
            <div className="size-3 bg-indigo-200 dark:bg-indigo-800/50" />
            <div className="size-3 bg-indigo-300 dark:bg-indigo-700/60" />
            <div className="size-3 bg-indigo-400 dark:bg-indigo-600/70" />
            <div className="size-3 bg-indigo-500 dark:bg-indigo-500" />
            <div className="size-3 bg-indigo-600 dark:bg-indigo-400" />
            <div className="size-3 bg-indigo-700 dark:bg-indigo-300" />
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
                      className="mt-1 font-mono text-[10px] whitespace-nowrap text-muted"
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
              className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background px-3 py-2 text-xs whitespace-nowrap shadow-lg"
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

const INITIAL_VISIBLE_COUNT = 10;

/**
 * Sortable table view for opcode data
 */
function OpcodeTable({ opcodeStats, searchTerm }: { opcodeStats: OpcodeStats[]; searchTerm: string }): JSX.Element {
  const [sortField, setSortField] = useState<'opcode' | 'count' | 'totalGas'>('totalGas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const totalGas = useMemo(() => opcodeStats.reduce((sum, op) => sum + op.totalGas, 0), [opcodeStats]);

  const sortedData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return [...opcodeStats]
      .map(op => ({
        ...op,
        percentage: totalGas > 0 ? (op.totalGas / totalGas) * 100 : 0,
        category: getOpcodeCategory(op.opcode),
      }))
      .filter(op => {
        if (!searchTerm) return true;
        return op.opcode.toLowerCase().includes(searchLower) || op.category.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
  }, [opcodeStats, sortField, sortDir, totalGas, searchTerm]);

  // Reset visible count when search changes
  const prevSearchTerm = useRef(searchTerm);
  if (prevSearchTerm.current !== searchTerm) {
    prevSearchTerm.current = searchTerm;
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  const visibleData = sortedData.slice(0, visibleCount);
  const hasMore = sortedData.length > visibleCount;
  const remainingCount = sortedData.length - visibleCount;

  const handleSort = (field: typeof sortField): void => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({
    field,
    children,
    align = 'left',
  }: {
    field: typeof sortField;
    children: React.ReactNode;
    align?: 'left' | 'right';
  }): JSX.Element => (
    <th
      scope="col"
      className={`cursor-pointer px-3 py-3.5 text-sm font-semibold whitespace-nowrap text-foreground transition-colors hover:text-primary ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {children}
        {sortField === field && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div className="overflow-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="sticky top-0 bg-surface">
          <tr>
            <SortHeader field="opcode">Opcode</SortHeader>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-foreground">
              Category
            </th>
            <SortHeader field="count" align="right">
              Count
            </SortHeader>
            <SortHeader field="totalGas" align="right">
              Total Gas
            </SortHeader>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold whitespace-nowrap text-foreground">
              %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {visibleData.map(op => (
            <tr key={op.opcode} className="transition-colors hover:bg-background">
              <td className="px-3 py-3 font-mono text-sm text-foreground">{op.opcode}</td>
              <td className="px-3 py-3 text-sm text-muted">
                <span
                  className="rounded-xs px-1.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[op.category] ?? '#6b7280'}20`,
                    color: CATEGORY_COLORS[op.category] ?? '#6b7280',
                  }}
                >
                  {op.category}
                </span>
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm text-muted">{op.count.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono text-sm text-foreground">{formatGas(op.totalGas)}</td>
              <td className="px-3 py-3 text-right text-sm text-muted">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(op.percentage, 100)}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs">{op.percentage.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Show More Button */}
      {hasMore && (
        <div className="flex justify-center border-t border-border py-4">
          <button
            onClick={() => setVisibleCount(sortedData.length)}
            className="flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
          >
            Show All ({remainingCount} more)
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * OpcodeAnalysis - Combined charts and table for opcode distribution
 *
 * Displays:
 * - Two bar charts side by side (by gas and by count)
 * - Full-width sortable table below
 */
export function OpcodeAnalysis({
  opcodeStats,
  maxOpcodes = 15,
  showHeader = true,
  showCharts = true,
  showTable = true,
  showHeatmap = false,
}: OpcodeAnalysisProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');

  if (opcodeStats.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-surface/30 p-8 text-center text-sm text-muted">
        No opcode data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two charts side by side */}
      {showCharts && (
        <div className="grid grid-cols-2 gap-6">
          <PopoutCard title="Opcodes by Gas" subtitle="Top opcodes by gas consumption">
            {({ inModal }) => (
              <OpcodeByGasChart opcodeStats={opcodeStats} maxOpcodes={maxOpcodes} minHeight={inModal ? 400 : 280} />
            )}
          </PopoutCard>

          <PopoutCard title="Opcodes by Count" subtitle="Top opcodes by execution count">
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

      {/* Full-width table */}
      {showTable && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            {showHeader ? (
              <div>
                <h3 className="text-sm font-medium text-foreground">Opcode Details</h3>
                <p className="text-xs text-muted">Click column headers to sort</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted">Click column headers to sort</p>
              </div>
            )}
            <input
              type="text"
              placeholder="Search opcodes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-xs border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="overflow-hidden rounded-sm border border-border">
            <OpcodeTable opcodeStats={opcodeStats} searchTerm={searchTerm} />
          </div>
        </div>
      )}
    </div>
  );
}
