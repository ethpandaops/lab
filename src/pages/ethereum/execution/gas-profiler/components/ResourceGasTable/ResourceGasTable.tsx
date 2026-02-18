import { type JSX, useState, useMemo } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { RESOURCE_COLORS } from '../../utils/resourceGas';
import type { OpcodeResourceRow } from '../../utils/resourceGas';

export interface ResourceGasTableProps {
  /** Per-opcode resource attribution rows */
  rows: OpcodeResourceRow[];
  /** Maximum rows to show before "show more" */
  maxRows?: number;
  /** Whether data is loading */
  loading?: boolean;
}

type SortField =
  | 'opcode'
  | 'totalGas'
  | 'count'
  | 'compute'
  | 'memory'
  | 'addressAccess'
  | 'stateGrowth'
  | 'history'
  | 'bloomTopics'
  | 'blockSize';

const ALL_RESOURCE_COLUMNS: { field: SortField; label: string; color: string }[] = [
  { field: 'compute', label: 'Compute', color: RESOURCE_COLORS.Compute },
  { field: 'memory', label: 'Memory', color: RESOURCE_COLORS.Memory },
  { field: 'addressAccess', label: 'Addr Access', color: RESOURCE_COLORS['Address Access'] },
  { field: 'stateGrowth', label: 'State Growth', color: RESOURCE_COLORS['State Growth'] },
  { field: 'history', label: 'History', color: RESOURCE_COLORS.History },
  { field: 'bloomTopics', label: 'Bloom', color: RESOURCE_COLORS['Bloom Topics'] },
  { field: 'blockSize', label: 'Block Size', color: RESOURCE_COLORS['Block Size'] },
];

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  if (value === 0) return '\u2013';
  return value.toLocaleString();
}

/**
 * Sortable table showing per-opcode resource gas attribution.
 * Styled to match OpcodeAnalysis table (Opcode Details).
 */
export function ResourceGasTable({ rows, maxRows = 20, loading = false }: ResourceGasTableProps): JSX.Element {
  const [sortField, setSortField] = useState<SortField>('totalGas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Only show resource columns that have at least one non-zero value
  const visibleColumns = useMemo(
    () =>
      ALL_RESOURCE_COLUMNS.filter(col => rows.some(row => (row[col.field as keyof OpcodeResourceRow] as number) > 0)),
    [rows]
  );

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = searchTerm ? rows.filter(row => row.opcode.toLowerCase().includes(searchTerm.toLowerCase())) : rows;

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField] as number | string;
    const bVal = b[sortField] as number | string;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const diff = (aVal as number) - (bVal as number);
    return sortDir === 'asc' ? diff : -diff;
  });

  const displayed = showAll ? sorted : sorted.slice(0, maxRows);
  const hasMore = !showAll && sorted.length > maxRows;
  const remainingCount = sorted.length - maxRows;

  if (loading) {
    return (
      <Card className="p-4">
        <div className="h-48 animate-pulse rounded-xs bg-surface" />
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted">No per-opcode resource data available</p>
      </Card>
    );
  }

  const SortHeader = ({
    field,
    children,
    align = 'right',
  }: {
    field: SortField;
    children: React.ReactNode;
    align?: 'left' | 'right';
  }): JSX.Element => (
    <th
      scope="col"
      onClick={() => handleSort(field)}
      className={clsx(
        'cursor-pointer px-3 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
        align === 'right' ? 'text-right' : 'text-left',
        sortField === field ? 'text-primary' : 'text-foreground'
      )}
    >
      <span className={clsx('inline-flex items-center gap-1', align === 'right' && 'justify-end')}>
        {children}
        {sortField === field && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Resource Details</h3>
          <p className="text-xs text-muted">Click column headers to sort</p>
        </div>
        <input
          type="text"
          placeholder="Search opcodes..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="rounded-xs border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>
      <div className="overflow-hidden rounded-sm border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="sticky top-0 bg-surface">
              <tr>
                <SortHeader field="opcode" align="left">
                  Opcode
                </SortHeader>
                <SortHeader field="count">Count</SortHeader>
                <SortHeader field="totalGas">Total Gas</SortHeader>
                {visibleColumns.map(col => (
                  <SortHeader key={col.field} field={col.field}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.label}
                  </SortHeader>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {displayed.map(row => (
                <tr key={row.opcode} className="transition-colors hover:bg-background">
                  <td className="px-3 py-3 font-mono text-sm text-foreground">{row.opcode}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm text-muted">{row.count.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm text-foreground">
                    {row.totalGas.toLocaleString()}
                  </td>
                  {visibleColumns.map(col => (
                    <td key={col.field} className="px-3 py-3 text-right font-mono text-sm text-muted">
                      {formatGas(row[col.field as keyof OpcodeResourceRow] as number)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="flex justify-center border-t border-border py-4">
            <button
              onClick={() => setShowAll(true)}
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
    </div>
  );
}
