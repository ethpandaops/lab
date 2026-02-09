import { Fragment, type JSX, useMemo, useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChevronUpDownIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import type { BlockSimulationResult, TxSummary, OpcodeSummary, CallError } from '../../SimulatePage.types';

/**
 * Props for the BlockSimulationResults component
 */
export interface BlockSimulationResultsProps {
  /** Simulation result data */
  result: BlockSimulationResult;
  /** Optional className */
  className?: string;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Format percentage with sign
 */
function formatDelta(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * Get color class based on delta direction
 */
function getDeltaColor(percent: number): string {
  if (percent < -5) return 'text-green-500';
  if (percent > 5) return 'text-red-500';
  return 'text-muted';
}

/**
 * Renders a list of call errors with indentation based on depth,
 * or a success indicator when there are no errors
 */
interface CallErrorListProps {
  errors: CallError[];
  variant: 'original' | 'simulated';
  className?: string;
}

function CallErrorList({ errors, variant, className }: CallErrorListProps): JSX.Element {
  const hasErrors = errors && errors.length > 0;
  const isOriginal = variant === 'original';

  // Sort by depth ascending so tree reads root → leaf (top-level call first)
  const sortedErrors = hasErrors ? [...errors].sort((a, b) => a.depth - b.depth) : [];

  return (
    <div
      className={clsx(
        'rounded-xs border p-3',
        isOriginal ? 'border-border/50 bg-surface/30' : 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={clsx(
            'rounded-xs px-2 py-0.5 text-xs font-semibold tracking-wide uppercase',
            isOriginal ? 'bg-muted/20 text-muted' : 'bg-primary/20 text-primary'
          )}
        >
          {isOriginal ? 'Original' : 'Simulated'}
        </span>
      </div>
      {hasErrors ? (
        <div className="space-y-1.5 text-xs">
          {sortedErrors.map((err, idx) => (
            <div key={idx} className="flex items-start gap-1.5 font-mono" style={{ marginLeft: `${err.depth * 16}px` }}>
              <span className="text-muted">{err.depth > 0 ? '└─' : '•'}</span>
              <span className="text-amber-400">{err.type}</span>
              <span className="text-muted">→</span>
              <span className="text-foreground/80">{err.address}</span>
              <span className="text-red-400">({err.error})</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-green-500">
          <CheckCircleIcon className="size-4" />
          <span>No errors</span>
        </div>
      )}
    </div>
  );
}

/**
 * Sort field type for transactions
 */
type SortField = 'index' | 'original' | 'simulated' | 'delta';

/**
 * Summary card showing original vs simulated gas comparison with optional limit indicator
 */
interface GasComparisonCardProps {
  original: number;
  simulated: number;
  gasLimit?: number;
  wouldExceedLimit?: boolean;
  className?: string;
}

function GasComparisonCard({
  original,
  simulated,
  gasLimit,
  wouldExceedLimit,
  className,
}: GasComparisonCardProps): JSX.Element {
  const limitPercent = gasLimit ? Math.round((simulated / gasLimit) * 100) : null;
  const simulatedColor =
    simulated > original ? 'text-red-500' : simulated < original ? 'text-green-500' : 'text-foreground';
  const deltaPercent = original > 0 ? ((simulated - original) / original) * 100 : 0;

  return (
    <Card className={clsx('p-4', className)}>
      <div className="text-sm font-medium text-muted">Total Gas Used</div>
      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold text-muted">{formatGas(original)}</span>
          <span className="text-xs text-muted">original</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={clsx('font-mono text-xl font-bold', simulatedColor)}>{formatGas(simulated)}</span>
          <span className={clsx('text-sm font-medium', getDeltaColor(deltaPercent))}>
            ({deltaPercent > 0 ? '+' : ''}
            {deltaPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
      {gasLimit && limitPercent !== null && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Limit:</span>
            <span className="font-mono">{formatGas(gasLimit)}</span>
          </div>
          <div
            className={clsx('flex items-center gap-1.5 text-xs', wouldExceedLimit ? 'text-red-500' : 'text-green-500')}
          >
            {wouldExceedLimit ? <ExclamationTriangleIcon className="size-4" /> : <CheckCircleIcon className="size-4" />}
            <span className="font-medium">{wouldExceedLimit ? 'Exceeds limit' : 'Within limit'}</span>
            <span className="text-muted">({limitPercent}%)</span>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Block Simulation Results component
 *
 * Displays the results of a block gas simulation including:
 * - Block summary comparing original vs simulated gas
 * - Gas limit exceeded indicator
 * - Top impacted opcodes
 * - Transaction impact list
 *
 * @example
 * ```tsx
 * <BlockSimulationResults result={simulationResult} />
 * ```
 */
export function BlockSimulationResults({ result, className }: BlockSimulationResultsProps): JSX.Element {
  const [sortField, setSortField] = useState<SortField>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleTxCount, setVisibleTxCount] = useState(10);
  const [visibleOpcodeCount, setVisibleOpcodeCount] = useState(15);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRowExpansion = useCallback((txHash: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(txHash)) {
        next.delete(txHash);
      } else {
        next.add(txHash);
      }
      return next;
    });
  }, []);

  // Calculate overall gas delta
  const overallDelta = useMemo(() => {
    if (result.original.gasUsed === 0) return 0;
    return ((result.simulated.gasUsed - result.original.gasUsed) / result.original.gasUsed) * 100;
  }, [result.original.gasUsed, result.simulated.gasUsed]);

  // Calculate divergence summary
  const divergenceSummary = useMemo(() => {
    const divergedCount = result.transactions.filter(tx => tx.diverged).length;
    const statusChanges = result.transactions.filter(tx => tx.originalStatus !== tx.simulatedStatus).length;
    const totalOriginalReverts = result.transactions.reduce((sum, tx) => sum + tx.originalReverts, 0);
    const totalSimulatedReverts = result.transactions.reduce((sum, tx) => sum + tx.simulatedReverts, 0);
    const additionalReverts = totalSimulatedReverts - totalOriginalReverts;
    return {
      divergedCount,
      statusChanges,
      totalOriginalReverts,
      totalSimulatedReverts,
      additionalReverts,
    };
  }, [result.transactions]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...result.transactions].sort((a, b) => {
      switch (sortField) {
        case 'index':
          return a.index - b.index;
        case 'original':
          return a.originalGas - b.originalGas;
        case 'simulated':
          return a.simulatedGas - b.simulatedGas;
        case 'delta':
          return Math.abs(a.deltaPercent) - Math.abs(b.deltaPercent);
        default:
          return 0;
      }
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [result.transactions, sortField, sortDir]);

  // Get opcode breakdown (sorted by impact when changes exist, by gas consumed otherwise)
  const opcodeBreakdownData = useMemo(() => {
    const opcodes = Object.entries(result.opcodeBreakdown)
      .map(([opcode, summary]: [string, OpcodeSummary]) => {
        // Delta based on total gas consumed (not per-opcode average)
        // This shows the real impact including execution path changes
        const delta =
          summary.originalGas > 0 ? ((summary.simulatedGas - summary.originalGas) / summary.originalGas) * 100 : 0;
        return {
          opcode,
          originalCount: summary.originalCount,
          simulatedCount: summary.simulatedCount,
          originalGas: summary.originalGas,
          simulatedGas: summary.simulatedGas,
          delta,
        };
      })
      .filter(o => o.originalGas > 0 || o.simulatedGas > 0); // Only show opcodes that consumed gas

    // Check if there are any meaningful changes
    const hasChanges = opcodes.some(o => Math.abs(o.delta) > 0.1);

    // Sort by impact if there are changes, otherwise by gas consumed
    return hasChanges
      ? opcodes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      : opcodes.sort((a, b) => b.originalGas - a.originalGas);
  }, [result.opcodeBreakdown]);

  // Handle sort change
  const handleSortChange = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  // Sort header component
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }): JSX.Element => (
    <th
      scope="col"
      onClick={() => handleSortChange(field)}
      className={clsx(
        'cursor-pointer px-3 py-3 text-right text-xs font-semibold whitespace-nowrap transition-colors hover:text-primary',
        sortField === field ? 'text-primary' : 'text-foreground'
      )}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {children}
        {sortField === field && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div className={clsx(className)}>
      <TabGroup>
        <ScrollableTabs>
          <Tab>Summary</Tab>
          <Tab>Transactions</Tab>
        </ScrollableTabs>

        <TabPanels className="mt-6">
          {/* Summary Tab - Block Summary + Opcode Breakdown */}
          <TabPanel className="space-y-6">
            {/* Block Summary */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-foreground">Block Summary</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* Total Gas Used with Limit Status */}
                <GasComparisonCard
                  original={result.original.gasUsed}
                  simulated={result.simulated.gasUsed}
                  gasLimit={result.simulated.gasLimit}
                  wouldExceedLimit={result.simulated.wouldExceedLimit}
                />

                {/* Overall Impact */}
                <Card className="p-4">
                  <div className="text-sm font-medium text-muted">Overall Impact</div>
                  <div className="mt-2 flex items-center gap-2">
                    {overallDelta < 0 ? (
                      <ArrowTrendingDownIcon className="size-6 text-green-500" />
                    ) : overallDelta > 0 ? (
                      <ArrowTrendingUpIcon className="size-6 text-red-500" />
                    ) : (
                      <ChevronUpDownIcon className="size-6 text-muted" />
                    )}
                    <div className={clsx('text-xl font-bold', getDeltaColor(overallDelta))}>
                      {formatDelta(overallDelta)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted">gas change</div>
                </Card>

                {/* Execution Divergence */}
                <Card className="p-4">
                  <div className="text-sm font-medium text-muted">Execution Divergence</div>
                  {divergenceSummary.divergedCount > 0 ||
                  divergenceSummary.statusChanges > 0 ||
                  divergenceSummary.additionalReverts !== 0 ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <ArrowsRightLeftIcon className="size-6 text-amber-500" />
                        <span className="text-xl font-bold text-amber-500">{divergenceSummary.divergedCount}</span>
                        <span className="text-sm text-muted">
                          tx{divergenceSummary.divergedCount !== 1 ? 's' : ''} diverged
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {[
                          divergenceSummary.statusChanges > 0 &&
                            `${divergenceSummary.statusChanges} status change${divergenceSummary.statusChanges !== 1 ? 's' : ''}`,
                          divergenceSummary.additionalReverts !== 0 &&
                            `${divergenceSummary.additionalReverts > 0 ? '+' : ''}${divergenceSummary.additionalReverts} revert${Math.abs(divergenceSummary.additionalReverts) !== 1 ? 's' : ''}`,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <CheckCircleIcon className="size-6 text-green-500" />
                      <span className="font-medium text-green-500">No divergence</span>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Opcode Breakdown */}
            {opcodeBreakdownData.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-medium text-foreground">Opcode Breakdown</h3>
                <p className="mb-3 text-xs text-muted">
                  Total gas consumed per opcode. Changes reflect both gas cost differences and execution path
                  divergence.
                </p>
                <div className="overflow-hidden rounded-xs border border-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-surface">
                        <tr>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-foreground">
                            Opcode
                          </th>
                          <th scope="col" className="px-3 py-3 text-right text-xs font-semibold text-foreground">
                            Executions
                          </th>
                          <th scope="col" className="px-3 py-3 text-right text-xs font-semibold text-foreground">
                            Original Gas
                          </th>
                          <th scope="col" className="px-3 py-3 text-right text-xs font-semibold text-foreground">
                            Simulated Gas
                          </th>
                          <th scope="col" className="px-3 py-3 text-right text-xs font-semibold text-foreground">
                            Delta
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface/50">
                        {opcodeBreakdownData.slice(0, visibleOpcodeCount).map(op => (
                          <tr key={op.opcode}>
                            <td className="px-3 py-2.5 font-mono text-sm text-foreground">{op.opcode}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm text-muted">
                              {formatGas(op.originalCount)}
                              {op.originalCount !== op.simulatedCount && (
                                <span className="text-amber-400"> → {formatGas(op.simulatedCount)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm text-muted">
                              {formatGas(op.originalGas)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm text-foreground">
                              {formatGas(op.simulatedGas)}
                            </td>
                            <td
                              className={clsx(
                                'px-3 py-2.5 text-right font-mono text-sm font-medium',
                                getDeltaColor(op.delta)
                              )}
                            >
                              {formatDelta(op.delta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Show More Button */}
                  {opcodeBreakdownData.length > visibleOpcodeCount && (
                    <div className="flex justify-center border-t border-border py-4">
                      <button
                        onClick={() => setVisibleOpcodeCount(opcodeBreakdownData.length)}
                        className="flex items-center gap-2 rounded-xs border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
                      >
                        Show All ({opcodeBreakdownData.length - visibleOpcodeCount} more)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabPanel>

          {/* Transaction Impact Tab */}
          <TabPanel>
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Transaction Impact</h3>
                <span className="text-xs text-muted">{result.transactions.length} transactions</span>
              </div>
              <div className="overflow-hidden rounded-xs border border-border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface">
                      <tr>
                        <SortHeader field="index">#</SortHeader>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-foreground">
                          Transaction
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-semibold text-foreground">
                          Status
                        </th>
                        <SortHeader field="original">Original</SortHeader>
                        <SortHeader field="simulated">Simulated</SortHeader>
                        <SortHeader field="delta">Delta</SortHeader>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface/50">
                      {sortedTransactions.slice(0, visibleTxCount).map((tx: TxSummary) => {
                        const statusChanged = tx.originalStatus !== tx.simulatedStatus;
                        const hasErrors = (tx.originalErrors?.length ?? 0) > 0 || (tx.simulatedErrors?.length ?? 0) > 0;
                        const isExpanded = expandedRows.has(tx.hash);
                        return (
                          <Fragment key={tx.hash}>
                            <tr
                              className={clsx('transition-colors hover:bg-surface/80', hasErrors && 'cursor-pointer')}
                              onClick={hasErrors ? () => toggleRowExpansion(tx.hash) : undefined}
                            >
                              <td className="px-3 py-2.5 text-right font-mono text-sm text-muted">
                                <div className="flex items-center justify-end gap-1">
                                  {hasErrors &&
                                    (isExpanded ? (
                                      <ChevronDownIcon className="size-3 text-muted" />
                                    ) : (
                                      <ChevronRightIcon className="size-3 text-muted" />
                                    ))}
                                  {tx.index}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <Link
                                    to="/ethereum/execution/gas-profiler/tx/$txHash"
                                    params={{ txHash: tx.hash }}
                                    search={{ block: result.blockNumber }}
                                    className="font-mono text-primary hover:underline"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                                  </Link>
                                  {tx.diverged && (
                                    <span
                                      className="rounded-xs bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-500"
                                      title="Execution path diverged"
                                    >
                                      diverged
                                    </span>
                                  )}
                                  {hasErrors && (
                                    <span
                                      className="rounded-xs bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500"
                                      title="Call errors occurred"
                                    >
                                      errors
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  {statusChanged ? (
                                    <>
                                      <span
                                        className={clsx(
                                          'rounded-xs px-1.5 py-0.5 text-xs font-medium',
                                          tx.originalStatus === 'success'
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-red-500/10 text-red-500'
                                        )}
                                      >
                                        {tx.originalStatus}
                                      </span>
                                      <span className="text-xs text-muted">→</span>
                                      <span
                                        className={clsx(
                                          'rounded-xs px-1.5 py-0.5 text-xs font-medium',
                                          tx.simulatedStatus === 'success'
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-red-500/10 text-red-500'
                                        )}
                                      >
                                        {tx.simulatedStatus}
                                      </span>
                                    </>
                                  ) : (
                                    <span
                                      className={clsx(
                                        'rounded-xs px-1.5 py-0.5 text-xs font-medium',
                                        tx.originalStatus === 'success'
                                          ? 'bg-green-500/10 text-green-500'
                                          : 'bg-red-500/10 text-red-500'
                                      )}
                                    >
                                      {tx.originalStatus}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-sm text-muted">
                                {formatGas(tx.originalGas)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-sm text-foreground">
                                {formatGas(tx.simulatedGas)}
                              </td>
                              <td
                                className={clsx(
                                  'px-3 py-2.5 text-right font-mono text-sm font-medium',
                                  getDeltaColor(tx.deltaPercent)
                                )}
                              >
                                {formatDelta(tx.deltaPercent)}
                              </td>
                            </tr>
                            {/* Expanded row for call errors */}
                            {isExpanded && hasErrors && (
                              <tr className="bg-surface/30">
                                <td colSpan={6} className="px-4 py-3">
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <CallErrorList errors={tx.originalErrors} variant="original" />
                                    <CallErrorList errors={tx.simulatedErrors} variant="simulated" />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Show More Button */}
                {result.transactions.length > visibleTxCount && (
                  <div className="flex justify-center border-t border-border py-4">
                    <button
                      onClick={() => setVisibleTxCount(result.transactions.length)}
                      className="flex items-center gap-2 rounded-xs border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
                    >
                      Show All ({result.transactions.length - visibleTxCount} more)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
