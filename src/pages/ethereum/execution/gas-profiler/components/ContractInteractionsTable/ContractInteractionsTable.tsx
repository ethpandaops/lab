import React, { type JSX, useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon, CogIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { ContractInteractionsTableProps, ContractInteractionItem } from './ContractInteractionsTable.types';

/**
 * Sort field options for contracts table
 */
type ContractSortField = 'gas' | 'calls';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string | null): string {
  if (!address) return '—';
  if (address === 'unknown') return '(Unknown)';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

/**
 * Get call type badge styling
 */
function getCallTypeStyles(callType: string): { bg: string; text: string } {
  switch (callType) {
    case 'CREATE':
      return { bg: 'bg-orange-500/10', text: 'text-orange-500' };
    case 'CREATE2':
      return { bg: 'bg-amber-500/10', text: 'text-amber-500' };
    case 'DELEGATECALL':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400' };
    case 'STATICCALL':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
    case 'CALL':
    default:
      return { bg: 'bg-blue-500/10', text: 'text-blue-400' };
  }
}

/**
 * Single contract row
 */
function ContractRow({
  contract,
  totalGas,
  onContractClick,
  showImplementations,
  isExpanded,
  onToggleExpand,
  rowIndex,
}: {
  contract: ContractInteractionItem;
  totalGas: number;
  onContractClick?: (contract: ContractInteractionItem) => void;
  showImplementations?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  rowIndex: number;
}): JSX.Element {
  const pct = totalGas > 0 ? (contract.gas / totalGas) * 100 : 0;
  const hasChildren = showImplementations && contract.implementations && contract.implementations.length > 0;

  return (
    <tr className={clsx('transition-colors hover:bg-background', rowIndex % 2 === 0 ? 'bg-surface/30' : 'bg-surface')}>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Cog icon for delegated contracts */}
          {contract.isImplementation && (
            <div className="group relative flex shrink-0 cursor-help items-center">
              <CogIcon className="size-4 text-muted" />
              <div className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 hidden w-max max-w-48 -translate-y-1/2 rounded-xs border border-border bg-background px-2 py-1 text-xs text-muted shadow-lg group-hover:block">
                Delegated contract - runs code on behalf of a proxy
              </div>
            </div>
          )}
          {/* Contract info - clickable if handler provided */}
          {onContractClick ? (
            <button
              onClick={() => onContractClick(contract)}
              className="flex items-center gap-1.5 text-left hover:underline"
            >
              {contract.name && (
                <>
                  <span
                    className={contract.isImplementation ? 'font-medium text-muted' : 'font-medium text-foreground'}
                  >
                    {contract.name}
                  </span>
                  <span className="text-border">·</span>
                </>
              )}
              <span className="font-mono text-xs text-muted">{truncateAddress(contract.address)}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {contract.name && (
                <>
                  <span
                    className={contract.isImplementation ? 'font-medium text-muted' : 'font-medium text-foreground'}
                  >
                    {contract.name}
                  </span>
                  <span className="text-border">·</span>
                </>
              )}
              <span className="font-mono text-xs text-muted">{truncateAddress(contract.address)}</span>
            </div>
          )}
          {/* Expand/collapse toggle - placed after contract info so names align */}
          {showImplementations && hasChildren && (
            <button
              onClick={onToggleExpand}
              className="flex size-5 shrink-0 items-center justify-center rounded-xs text-muted hover:bg-surface hover:text-foreground"
            >
              {isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-right font-mono text-sm text-foreground">{formatGas(contract.gas)}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="w-12 text-right text-xs text-muted">{pct.toFixed(1)}%</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right font-mono text-sm text-muted">{contract.callCount.toLocaleString()}</td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {contract.callTypes.map(ct => {
            const styles = getCallTypeStyles(ct);
            return (
              <span key={ct} className={clsx('rounded-xs px-1.5 py-0.5 text-xs font-medium', styles.bg, styles.text)}>
                {ct}
              </span>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

/**
 * Implementation row (nested under parent contract)
 */
function ImplementationRow({
  contract,
  totalGas,
  onContractClick,
}: {
  contract: ContractInteractionItem;
  totalGas: number;
  onContractClick?: (contract: ContractInteractionItem) => void;
}): JSX.Element {
  const pct = totalGas > 0 ? (contract.gas / totalGas) * 100 : 0;

  return (
    <tr className="bg-surface/50 transition-colors hover:bg-background">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 pl-7">
          {/* Indent + cog icon */}
          <div className="group relative flex shrink-0 cursor-help items-center">
            <CogIcon className="size-4 text-muted" />
            <div className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 hidden w-max max-w-48 -translate-y-1/2 rounded-xs border border-border bg-background px-2 py-1 text-xs text-muted shadow-lg group-hover:block">
              Delegated contract - runs code on behalf of a proxy
            </div>
          </div>
          {/* Contract info */}
          {onContractClick ? (
            <button
              onClick={() => onContractClick(contract)}
              className="flex items-center gap-1.5 text-left hover:underline"
            >
              {contract.name && (
                <>
                  <span className="font-medium text-muted">{contract.name}</span>
                  <span className="text-border">·</span>
                </>
              )}
              <span className="font-mono text-xs text-muted">{truncateAddress(contract.address)}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {contract.name && (
                <>
                  <span className="font-medium text-muted">{contract.name}</span>
                  <span className="text-border">·</span>
                </>
              )}
              <span className="font-mono text-xs text-muted">{truncateAddress(contract.address)}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-right font-mono text-sm text-muted">{formatGas(contract.gas)}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary/50" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="w-12 text-right text-xs text-muted">{pct.toFixed(1)}%</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right font-mono text-sm text-muted">{contract.callCount.toLocaleString()}</td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {contract.callTypes.map(ct => {
            const styles = getCallTypeStyles(ct);
            return (
              <span key={ct} className={clsx('rounded-xs px-1.5 py-0.5 text-xs font-medium', styles.bg, styles.text)}>
                {ct}
              </span>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

/**
 * ContractInteractionsTable - Reusable table for displaying contract interactions
 *
 * Used on:
 * - BlockPage: Shows all contracts called in a block
 * - TransactionPage: Shows all contracts called in a transaction (with implementations)
 */
export function ContractInteractionsTable({
  contracts,
  totalGas,
  onContractClick,
  percentLabel = '% of Total',
  showImplementations = false,
  initialVisibleCount = 10,
}: ContractInteractionsTableProps): JSX.Element {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<ContractSortField>('gas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Auto-expand contracts with implementations on mount
  useEffect(() => {
    if (showImplementations) {
      const toExpand = new Set<string>();
      contracts.forEach(contract => {
        if (contract.implementations && contract.implementations.length > 0) {
          toExpand.add(contract.address);
        }
      });
      if (toExpand.size > 0) {
        setExpandedContracts(toExpand);
      }
    }
  }, [contracts, showImplementations]);

  const toggleExpand = useCallback((address: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      return next;
    });
  }, []);

  // Handle sort change
  const handleSortChange = useCallback(
    (field: ContractSortField) => {
      if (sortField === field) {
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  // Sort contracts
  const sortedContracts = useMemo(() => {
    const sorted = [...contracts].sort((a, b) => {
      switch (sortField) {
        case 'calls':
          return a.callCount - b.callCount;
        case 'gas':
        default:
          return a.gas - b.gas;
      }
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [contracts, sortField, sortDir]);

  const visibleContracts = sortedContracts.slice(0, visibleCount);
  const hasMore = contracts.length > visibleCount;

  if (contracts.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-surface/30 p-8 text-center text-sm text-muted">
        No contract interactions
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 bg-surface">
            <tr>
              <th className="px-4 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-foreground">
                Contract
              </th>
              <th
                onClick={() => handleSortChange('gas')}
                className={clsx(
                  'cursor-pointer px-4 py-3.5 text-right text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
                  sortField === 'gas' ? 'text-primary' : 'text-foreground'
                )}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Gas
                  {sortField === 'gas' && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </span>
              </th>
              <th className="px-4 py-3.5 text-right text-sm font-semibold whitespace-nowrap text-foreground">
                {percentLabel}
              </th>
              <th
                onClick={() => handleSortChange('calls')}
                className={clsx(
                  'cursor-pointer px-4 py-3.5 text-right text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
                  sortField === 'calls' ? 'text-primary' : 'text-foreground'
                )}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Calls
                  {sortField === 'calls' && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </span>
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-foreground">
                Call Types
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {visibleContracts.map((contract, i) => {
              const isExpanded = expandedContracts.has(contract.address);
              const hasImplementations =
                showImplementations && contract.implementations && contract.implementations.length > 0;

              return (
                <React.Fragment key={contract.address}>
                  <ContractRow
                    contract={contract}
                    totalGas={totalGas}
                    onContractClick={onContractClick}
                    showImplementations={showImplementations}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpand(contract.address)}
                    rowIndex={i}
                  />
                  {/* Nested implementation rows */}
                  {hasImplementations &&
                    isExpanded &&
                    contract.implementations!.map(impl => (
                      <ImplementationRow
                        key={impl.address}
                        contract={impl}
                        totalGas={totalGas}
                        onContractClick={onContractClick}
                      />
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show More Button */}
      {hasMore && (
        <div className="flex justify-center border-t border-border py-4">
          <button
            onClick={() => setVisibleCount(contracts.length)}
            className="flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
          >
            Show All ({contracts.length - visibleCount} more)
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
