import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { CALL_TYPE_COLORS } from '../../utils';

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
 * Item data for the table
 */
export interface TopGasItem {
  /** Unique identifier for the item */
  id: string | number;
  /** Display name (contract name, etc.) */
  name: string | null;
  /** Secondary identifier (hash, address) */
  identifier: string;
  /** Gas used */
  gas: number;
  /** Optional call type badge */
  callType?: string;
  /** Optional index number to display */
  index?: number;
  /** Optional flag for failed/error state */
  hasError?: boolean;
}

export interface TopItemsByGasTableProps {
  /** Title for the card */
  title: string;
  /** Subtitle for the card */
  subtitle: string;
  /** Items to display (already sorted by gas descending) */
  items: TopGasItem[];
  /** Total gas for percentage calculation */
  totalGas: number;
  /** Number of items to show in compact view (default: 5) */
  compactCount?: number;
  /** Number of items to show in modal view (default: 10) */
  modalCount?: number;
  /** Optional callback when an item is clicked */
  onItemClick?: (item: TopGasItem) => void;
  /** Optional link generator for items (alternative to onItemClick) */
  getLinkProps?: (item: TopGasItem) => { to: string; params: Record<string, string>; search?: Record<string, unknown> };
  /** Optional "View All" button config */
  viewAll?: {
    count: number;
    onClick: () => void;
    /** Label for the items (e.g., "Calls", "Transactions"). Defaults to "Items" */
    label?: string;
  };
  /** Column headers configuration */
  columns?: {
    first: string;
    second: string;
  };
}

/**
 * TopItemsByGasTable - Reusable mini-table showing top items by gas consumption
 *
 * Used for:
 * - BlockPage: Top Transactions by Gas
 * - TransactionPage: Top Calls by Gas
 */
export function TopItemsByGasTable({
  title,
  subtitle,
  items,
  totalGas,
  compactCount = 5,
  modalCount = 10,
  onItemClick,
  getLinkProps,
  viewAll,
  columns = { first: '#', second: 'Item' },
}: TopItemsByGasTableProps): JSX.Element {
  const renderRow = (item: TopGasItem) => {
    const pct = totalGas > 0 ? (item.gas / totalGas) * 100 : 0;

    const identifierContent = (
      <>
        {item.name ? (
          <span className="font-medium text-foreground group-hover:text-primary">{item.name}</span>
        ) : (
          <span className="font-mono text-foreground group-hover:text-primary">
            {item.identifier.slice(0, 10)}...{item.identifier.slice(-8)}
          </span>
        )}
        {item.hasError && <span className="size-1.5 rounded-full bg-danger" title="Failed" />}
      </>
    );

    return (
      <tr key={item.id} className="border-b border-border/50 last:border-0">
        {/* First column: index or call type */}
        <td className="py-2 pr-2">
          {item.callType ? (
            <span
              className="inline-block rounded-xs px-1.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${CALL_TYPE_COLORS[item.callType] ?? '#6b7280'}20`,
                color: CALL_TYPE_COLORS[item.callType] ?? '#6b7280',
              }}
            >
              {item.callType}
            </span>
          ) : (
            <span className="text-muted">{item.index}</span>
          )}
        </td>

        {/* Second column: name/identifier with link */}
        <td className="px-2 py-2">
          {getLinkProps ? (
            <Link {...getLinkProps(item)} className="group flex items-center gap-1.5">
              {identifierContent}
            </Link>
          ) : onItemClick ? (
            <button onClick={() => onItemClick(item)} className="group flex items-center gap-1.5 text-left">
              {identifierContent}
            </button>
          ) : (
            <span className="flex items-center gap-1.5">{identifierContent}</span>
          )}
        </td>

        {/* Gas column */}
        <td className="px-2 py-2 text-right font-mono text-foreground">{formatCompact(item.gas)}</td>

        {/* Percentage column */}
        <td className="py-2 pl-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="w-10 text-right text-xs text-muted">{pct.toFixed(1)}%</span>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <PopoutCard title={title} subtitle={subtitle}>
      {({ inModal }) => {
        const displayItems = items.slice(0, inModal ? modalCount : compactCount);

        return displayItems.length > 0 ? (
          <div className="overflow-auto" style={{ height: inModal ? 400 : 280 }}>
            <table className="min-w-full">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-2 pr-2 text-left font-medium">{columns.first}</th>
                  <th className="px-2 py-2 text-left font-medium">{columns.second}</th>
                  <th className="px-2 py-2 text-right font-medium">Gas</th>
                  <th className="py-2 pl-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="text-sm">{displayItems.map(item => renderRow(item))}</tbody>
            </table>
            {!inModal && viewAll && items.length > compactCount && (
              <button
                onClick={viewAll.onClick}
                className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs text-muted transition-colors hover:text-primary"
              >
                View All {viewAll.count} {viewAll.label ?? 'Items'}
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center text-sm text-muted" style={{ height: 280 }}>
            No data
          </div>
        );
      }}
    </PopoutCard>
  );
}
