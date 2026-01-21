import { type JSX, useMemo, useState, useRef } from 'react';
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
      showLabel={false}
      barWidth="70%"
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
      showLabel={false}
      barWidth="70%"
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
