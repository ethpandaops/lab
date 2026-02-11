import { type JSX, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@tanstack/react-router';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Alert } from '@/components/Feedback/Alert';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats/Stats.types';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { TenderlyIcon } from '@/components/Ethereum/TenderlyIcon';
import { PhalconIcon } from '@/components/Ethereum/PhalconIcon';
import { getOpcodeCategory, CATEGORY_COLORS } from '../../utils/opcodeUtils';
import type { BlockSimulationResult, TxSummary, OpcodeSummary, CallError } from '../../SimulatePage.types';

// ============================================================================
// TYPES
// ============================================================================

export interface BlockSimulationResultsV2Props {
  result: BlockSimulationResult;
  /** Names of gas params the user explicitly modified (e.g. ['SSTORE_SET', 'SLOAD_COLD']) */
  modifiedParams?: string[];
  className?: string;
}

interface OpcodeRowData {
  opcode: string;
  category: string;
  categoryColor: string;
  originalCount: number;
  simulatedCount: number;
  originalGas: number;
  simulatedGas: number;
  delta: number;
  absDelta: number;
}

interface CategoryGroup {
  name: string;
  color: string;
  totalOriginal: number;
  totalSimulated: number;
  delta: number;
  opcodes: OpcodeRowData[];
}

// ============================================================================
// HELPERS
// ============================================================================

function formatGas(value: number): string {
  return value.toLocaleString();
}

function formatCompactGas(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatDelta(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

function getDeltaColor(percent: number): string {
  if (percent < 0) return 'text-green-500';
  if (percent > 0) return 'text-red-500';
  return 'text-muted';
}

// ============================================================================
// TOOLTIP (portal-based, reused from original)
// ============================================================================

interface TooltipProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  width?: string;
}

function Tooltip({ title, description, children, className, style, width = 'w-56' }: TooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
  }, [isVisible]);

  const tooltipContent = isVisible && (
    <div
      role="tooltip"
      className={clsx(
        'pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background p-3 shadow-lg',
        width
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-1.5 text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs/5 text-muted">{description}</div>
      <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
    </div>
  );

  return (
    <div
      ref={ref}
      className={clsx('inline-flex', className)}
      style={style}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </div>
  );
}

// ============================================================================
// CALL ERROR LIST (for Transactions tab)
// ============================================================================

/** Contained card showing call errors for one execution side */
function ErrorCard({
  label,
  errors,
  variant,
}: {
  label: string;
  errors: CallError[];
  variant: 'original' | 'simulated';
}): JSX.Element {
  const sorted = [...errors].sort((a, b) => a.depth - b.depth);
  const isSimulated = variant === 'simulated';
  const hasErrors = sorted.length > 0;

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xs border',
        isSimulated && hasErrors ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-border/50 bg-surface/20'
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center gap-2 border-b px-3 py-2',
          isSimulated && hasErrors ? 'border-red-500/15 bg-red-500/[0.04]' : 'border-border/30 bg-surface/30'
        )}
      >
        <div
          className={clsx(
            'size-1.5 shrink-0 rounded-full',
            hasErrors ? (isSimulated ? 'bg-red-500' : 'bg-amber-500') : 'bg-green-500'
          )}
        />
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        {hasErrors ? (
          <div className="space-y-0.5 overflow-x-auto">
            {sorted.map((err, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 py-0.5 whitespace-nowrap"
                style={{ paddingLeft: `${err.depth * 16}px` }}
              >
                {err.depth > 0 && <span className="text-[10px] text-muted/40">{'\u2514'}</span>}
                <span
                  className={clsx(
                    'shrink-0 rounded-xs px-1 py-px font-mono text-[10px] font-semibold',
                    isSimulated ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-500'
                  )}
                >
                  {err.type}
                </span>
                <span className="font-mono text-[11px] text-foreground/70">{err.address}</span>
                <span className="font-mono text-[11px] text-red-400/70">({err.error})</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <CheckCircleIcon className="size-3.5" />
            <span>No internal call errors</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// GAS COMPARISON SECTION
// ============================================================================

function GasComparisonSection({
  result,
  overallDelta,
}: {
  result: BlockSimulationResult;
  overallDelta: number;
}): JSX.Element {
  const gasLimit = result.simulated.gasLimit;
  const origPct = Math.min((result.original.gasUsed / gasLimit) * 100, 100);
  const simPct = Math.min((result.simulated.gasUsed / gasLimit) * 100, 100);
  const isIncrease = result.simulated.gasUsed > result.original.gasUsed;
  const absDelta = Math.abs(result.simulated.gasUsed - result.original.gasUsed);

  const simBarColor = overallDelta > 5 ? 'bg-red-500/30' : overallDelta < -5 ? 'bg-green-500/25' : 'bg-primary/25';

  return (
    <div className="space-y-2">
      {/* Original row */}
      <Tooltip
        title="Original Gas"
        description={
          <span>
            Gas consumed by the block as executed on-chain.
            <br />
            <span className="font-mono">{formatGas(result.original.gasUsed)}</span> of{' '}
            <span className="font-mono">{formatGas(gasLimit)}</span> gas limit ({Math.round(origPct)}% utilization).
          </span>
        }
        className="flex w-full items-center gap-3"
      >
        <div className="w-20 shrink-0 text-xs font-medium text-muted">Original</div>
        <div className="w-28 shrink-0 text-right font-mono text-sm font-bold text-muted tabular-nums">
          {formatGas(result.original.gasUsed)}
        </div>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/20">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground/15 transition-all duration-500"
            style={{ width: `${origPct}%` }}
          />
        </div>
        <div className="w-8 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{Math.round(origPct)}%</div>
      </Tooltip>

      {/* Simulated row */}
      <Tooltip
        title="Simulated Gas"
        description={
          <span>
            Gas consumed after applying your modified gas schedule.
            <br />
            {isIncrease ? '+' : '\u2212'}
            <span className="font-mono">{formatGas(absDelta)}</span> gas ({formatDelta(overallDelta)}) compared to
            original.
          </span>
        }
        className="flex w-full items-center gap-3"
      >
        <div className="w-20 shrink-0 text-xs font-medium text-muted">Simulated</div>
        <div
          className={clsx(
            'w-28 shrink-0 text-right font-mono text-sm font-bold tabular-nums',
            getDeltaColor(overallDelta)
          )}
        >
          {formatGas(result.simulated.gasUsed)}
        </div>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/20">
          <div
            className={clsx('absolute inset-y-0 left-0 rounded-full transition-all duration-500', simBarColor)}
            style={{ width: `${simPct}%` }}
          />
          {/* Original position marker on simulated bar */}
          <div className="absolute inset-y-0 z-10 w-px bg-foreground/40" style={{ left: `${origPct}%` }} />
        </div>
        <div className="w-8 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{Math.round(simPct)}%</div>
      </Tooltip>

      {/* Footer: delta + limit status */}
      <div className="flex items-center justify-between border-t border-border/30 pt-2">
        <div className="flex items-center gap-2">
          <span className={clsx('font-mono text-sm font-bold tabular-nums', getDeltaColor(overallDelta))}>
            {formatDelta(overallDelta)}
          </span>
          <span className="font-mono text-xs text-muted tabular-nums">
            ({isIncrease ? '+' : '\u2212'}
            {formatCompactGas(absDelta)} gas)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {result.simulated.wouldExceedLimit ? (
            <>
              <ExclamationTriangleIcon className="size-3 text-red-500" />
              <span className="text-xs font-medium text-red-500">Exceeds limit</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="size-3 text-green-500" />
              <span className="text-xs text-green-500">Within limit</span>
            </>
          )}
          <span className="text-xs text-muted">&middot; {formatCompactGas(gasLimit)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXECUTION HEALTH INDICATORS
// ============================================================================

function ExecutionHealthSection({
  divergenceSummary,
  totalTransactions,
}: {
  divergenceSummary: {
    divergedCount: number;
    statusChanges: number;
    totalOriginalReverts: number;
    totalSimulatedReverts: number;
    additionalReverts: number;
  };
  totalTransactions: number;
}): JSX.Element {
  const hasDivergence =
    divergenceSummary.divergedCount > 0 ||
    divergenceSummary.statusChanges > 0 ||
    divergenceSummary.additionalReverts !== 0;

  if (!hasDivergence) {
    return <Alert variant="success" description="No execution divergence — all transaction paths unchanged" />;
  }

  const divergedColor = divergenceSummary.divergedCount > 0 ? '#f59e0b' : '#22c55e';
  const statusColor = divergenceSummary.statusChanges > 0 ? '#ef4444' : '#22c55e';
  const revertsColor =
    divergenceSummary.additionalReverts > 0
      ? '#ef4444'
      : divergenceSummary.additionalReverts < 0
        ? '#22c55e'
        : '#6b7280';

  const stats: Stat[] = [
    {
      id: 'diverged',
      name: 'Diverged',
      value: String(divergenceSummary.divergedCount),
      icon: ArrowsRightLeftIcon,
      iconColor: divergedColor,
      valueClassName: divergenceSummary.divergedCount > 0 ? 'text-amber-500' : 'text-foreground',
      subtitle:
        totalTransactions > 0 && divergenceSummary.divergedCount > 0
          ? `${((divergenceSummary.divergedCount / totalTransactions) * 100).toFixed(1)}% of txs`
          : undefined,
      accentColor: `${divergedColor}33`,
    },
    {
      id: 'status',
      name: 'Status Changes',
      value: String(divergenceSummary.statusChanges),
      icon: ExclamationTriangleIcon,
      iconColor: statusColor,
      valueClassName: divergenceSummary.statusChanges > 0 ? 'text-red-500' : 'text-foreground',
      subtitle: divergenceSummary.statusChanges > 0 ? 'tx outcomes changed' : 'all outcomes preserved',
      accentColor: `${statusColor}33`,
    },
    {
      id: 'reverts',
      name: 'Internal Reverts',
      value: `${divergenceSummary.additionalReverts > 0 ? '+' : ''}${divergenceSummary.additionalReverts}`,
      icon: XMarkIcon,
      iconColor: revertsColor,
      valueClassName:
        divergenceSummary.additionalReverts > 0
          ? 'text-red-500'
          : divergenceSummary.additionalReverts < 0
            ? 'text-green-500'
            : 'text-foreground',
      subtitle:
        divergenceSummary.totalOriginalReverts > 0 || divergenceSummary.totalSimulatedReverts > 0
          ? `${divergenceSummary.totalOriginalReverts} \u2192 ${divergenceSummary.totalSimulatedReverts} total`
          : undefined,
      accentColor: `${revertsColor}33`,
    },
  ];

  return <Stats stats={stats} gridClassName="grid grid-cols-3 gap-3" />;
}

// ============================================================================
// OPCODE COMPARISON ROW
// ============================================================================

function OpcodeRow({ op, maxGas }: { op: OpcodeRowData; maxGas: number }): JSX.Element {
  const origWidth = maxGas > 0 ? (op.originalGas / maxGas) * 100 : 0;
  const simWidth = maxGas > 0 ? (op.simulatedGas / maxGas) * 100 : 0;
  const hasCountChange = op.originalCount !== op.simulatedCount;

  return (
    <Tooltip
      title={op.opcode}
      width="w-auto"
      description={
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 whitespace-nowrap">
          <span className="text-muted">Original</span>
          <span className="text-right font-mono tabular-nums">{formatGas(op.originalGas)}</span>
          <span className="text-muted">Simulated</span>
          <span className="text-right font-mono tabular-nums">{formatGas(op.simulatedGas)}</span>
          <span className="text-muted">Delta</span>
          <span className={clsx('text-right font-mono font-semibold tabular-nums', getDeltaColor(op.delta))}>
            {formatDelta(op.delta)}
          </span>
          {hasCountChange && (
            <>
              <span className="text-muted">Executions</span>
              <span className="text-right font-mono tabular-nums">
                {formatGas(op.originalCount)} &rarr; {formatGas(op.simulatedCount)}
              </span>
            </>
          )}
        </div>
      }
      style={{ display: 'block' }}
    >
      <div className="group rounded-xs py-1.5 pl-2 transition-colors hover:bg-surface/40">
        {/* Main row — mirrors category header pattern */}
        <div className="flex items-center gap-2">
          <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: op.categoryColor }} />
          <span className="font-mono text-xs font-semibold text-foreground">{op.opcode}</span>
          {hasCountChange && (
            <span className="font-mono text-[11px] text-muted tabular-nums">
              {formatGas(op.originalCount)} &rarr; {formatGas(op.simulatedCount)} execs
            </span>
          )}
          <div className="flex-1" />
          <span className="mr-1 font-mono text-xs text-muted tabular-nums">
            {formatCompactGas(op.originalGas)} &rarr; {formatCompactGas(op.simulatedGas)}
          </span>
          <span className={clsx('font-mono text-xs font-bold tabular-nums', getDeltaColor(op.delta))}>
            {formatDelta(op.delta)}
          </span>
        </div>
        {/* Mini before/after bars */}
        <div className="mt-1 ml-4 space-y-px">
          <div className="relative h-1 overflow-hidden rounded-full bg-border/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-foreground/12 transition-all duration-500"
              style={{ width: `${Math.max(origWidth, origWidth > 0 ? 0.5 : 0)}%` }}
            />
          </div>
          <div className="relative h-1 overflow-hidden rounded-full bg-border/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(simWidth, simWidth > 0 ? 0.5 : 0)}%`,
                backgroundColor: `${op.categoryColor}60`,
              }}
            />
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

// ============================================================================
// OPCODE BREAKDOWN SECTION (category-grouped)
// ============================================================================

function OpcodeBreakdownSection({
  categoryData,
  maxGas,
  modifiedParams,
}: {
  categoryData: CategoryGroup[];
  maxGas: number;
  modifiedParams?: string[];
}): JSX.Element {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const expanded = new Set<string>();

    if (modifiedParams && modifiedParams.length > 0) {
      // Map modified gas params to their categories, then expand those categories
      const modifiedCategories = new Set(modifiedParams.map(p => getOpcodeCategory(p)));
      for (const cat of categoryData) {
        if (modifiedCategories.has(cat.name)) {
          expanded.add(cat.name);
        }
      }
    }

    // Fallback: if no modified params matched, expand categories with delta changes
    if (expanded.size === 0) {
      for (const cat of categoryData) {
        if (Math.abs(cat.delta) > 0.1 || cat.opcodes.some(o => Math.abs(o.delta) > 0.1)) {
          expanded.add(cat.name);
        }
      }
    }

    // Final fallback: expand top 3 by gas
    if (expanded.size === 0) {
      categoryData.slice(0, 3).forEach(c => expanded.add(c.name));
    }

    return expanded;
  });

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return (
    <div>
      {/* Category groups */}
      <div className="divide-y divide-border/30">
        {categoryData.map(cat => {
          const isExpanded = expandedCategories.has(cat.name);
          return (
            <div key={cat.name}>
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.name)}
                className="flex w-full items-center gap-2 py-2.5 text-left transition-colors hover:bg-surface/30"
              >
                <ChevronRightIcon
                  className={clsx('size-3 text-muted transition-transform duration-200', isExpanded && 'rotate-90')}
                />
                <div className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                <span className="text-xs text-muted">
                  ({cat.opcodes.length} opcode{cat.opcodes.length !== 1 ? 's' : ''})
                </span>
                <div className="flex-1" />
                <span className="mr-1 font-mono text-xs text-muted tabular-nums">
                  {formatCompactGas(cat.totalOriginal)} &rarr; {formatCompactGas(cat.totalSimulated)}
                </span>
                <span className={clsx('font-mono text-xs font-bold tabular-nums', getDeltaColor(cat.delta))}>
                  {formatDelta(cat.delta)}
                </span>
              </button>

              {/* Opcode rows */}
              {isExpanded && (
                <div className="mb-1 ml-1.5 rounded-xs border-l-2 border-border/40 bg-surface/30 py-1 pl-3">
                  {cat.opcodes.map(op => (
                    <OpcodeRow key={op.opcode} op={op} maxGas={maxGas} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TRANSACTION IMPACT VIEW (card-based, self-contained)
// ============================================================================

type TxFilter = 'all' | 'diverged' | 'status' | 'errors';
type TxSort = 'delta' | 'index' | 'gas';

function TransactionImpactView({
  transactions,
  blockNumber,
}: {
  transactions: TxSummary[];
  blockNumber: number;
}): JSX.Element {
  const [filter, setFilter] = useState<TxFilter>('all');
  const [sortBy, setSortBy] = useState<TxSort>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedTxs, setExpandedTxs] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  const toggleExpand = useCallback((hash: string) => {
    setExpandedTxs(prev => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  }, []);

  const counts = useMemo(
    () => ({
      all: transactions.length,
      diverged: transactions.filter(t => t.diverged).length,
      status: transactions.filter(t => t.originalStatus !== t.simulatedStatus).length,
      errors: transactions.filter(t => (t.originalErrors?.length ?? 0) > 0 || (t.simulatedErrors?.length ?? 0) > 0)
        .length,
    }),
    [transactions]
  );

  const filteredAndSorted = useMemo(() => {
    let txs = [...transactions];

    switch (filter) {
      case 'diverged':
        txs = txs.filter(t => t.diverged);
        break;
      case 'status':
        txs = txs.filter(t => t.originalStatus !== t.simulatedStatus);
        break;
      case 'errors':
        txs = txs.filter(t => (t.originalErrors?.length ?? 0) > 0 || (t.simulatedErrors?.length ?? 0) > 0);
        break;
    }

    txs.sort((a, b) => {
      switch (sortBy) {
        case 'index':
          return a.index - b.index;
        case 'gas':
          return a.simulatedGas - b.simulatedGas;
        case 'delta':
          return Math.abs(a.deltaPercent) - Math.abs(b.deltaPercent);
        default:
          return 0;
      }
    });

    if (sortDir === 'desc') txs.reverse();
    return txs;
  }, [transactions, filter, sortBy, sortDir]);

  const toggleSort = useCallback(
    (field: TxSort) => {
      if (sortBy === field) {
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortDir('desc');
      }
    },
    [sortBy]
  );

  const filterOptions: { key: TxFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'diverged', label: 'Diverged', count: counts.diverged },
    { key: 'status', label: 'Status \u0394', count: counts.status },
    { key: 'errors', label: 'Errors', count: counts.errors },
  ];

  const sortOptions: { key: TxSort; label: string }[] = [
    { key: 'delta', label: 'Impact' },
    { key: 'index', label: 'Index' },
    { key: 'gas', label: 'Gas' },
  ];

  return (
    <div>
      {/* Filter + Sort bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Filters */}
        <div className="flex items-center gap-1 rounded-sm bg-surface/60 p-1">
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                setFilter(opt.key);
                setVisibleCount(20);
              }}
              className={clsx(
                'flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-medium transition-all',
                filter === opt.key ? 'bg-background text-foreground shadow-xs' : 'text-muted hover:text-foreground',
                opt.count === 0 && opt.key !== 'all' && 'opacity-40'
              )}
              disabled={opt.count === 0 && opt.key !== 'all'}
            >
              {opt.label}
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                  filter === opt.key ? 'bg-primary/10 text-primary' : 'bg-border/30 text-muted'
                )}
              >
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-1 rounded-sm bg-surface/60 p-1">
          <span className="px-2 text-[10px] font-medium tracking-wide text-muted uppercase">Sort</span>
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              className={clsx(
                'rounded-xs px-2.5 py-1.5 text-xs font-medium transition-all',
                sortBy === opt.key ? 'bg-background text-foreground shadow-xs' : 'text-muted hover:text-foreground'
              )}
            >
              {opt.label}
              {sortBy === opt.key && (
                <span className="ml-1 text-primary">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction cards */}
      <div className="divide-y divide-border/20">
        {filteredAndSorted.slice(0, visibleCount).map(tx => {
          const statusChanged = tx.originalStatus !== tx.simulatedStatus;
          const hasErrors = (tx.originalErrors?.length ?? 0) > 0 || (tx.simulatedErrors?.length ?? 0) > 0;
          const isExpanded = expandedTxs.has(tx.hash);
          const isNotable = statusChanged || tx.diverged || hasErrors;
          const absDelta = Math.abs(tx.simulatedGas - tx.originalGas);

          return (
            <div key={tx.hash} className="py-1">
              {/* Collapsed row — always visible */}
              <button
                type="button"
                onClick={() => toggleExpand(tx.hash)}
                className="flex w-full items-center gap-2 rounded-xs px-1 py-2 text-left transition-colors hover:bg-surface/40"
              >
                <ChevronRightIcon
                  className={clsx(
                    'size-3 shrink-0 text-muted transition-transform duration-200',
                    isExpanded && 'rotate-90'
                  )}
                />
                <span className="w-7 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{tx.index}</span>
                <span className="font-mono text-xs text-primary">
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                </span>

                {/* Simulated status icon */}
                {tx.simulatedStatus === 'success' ? (
                  <CheckCircleIcon className="size-4 shrink-0 text-green-500" />
                ) : (
                  <XCircleIcon className="size-4 shrink-0 text-red-500" />
                )}

                {/* Tiny indicator dots for notable items */}
                {isNotable && (
                  <div className="flex items-center gap-1">
                    {statusChanged && <div className="size-1.5 rounded-full bg-red-500" title="Status changed" />}
                    {tx.diverged && <div className="size-1.5 rounded-full bg-amber-500" title="Diverged" />}
                    {hasErrors && !statusChanged && (
                      <div className="size-1.5 rounded-full bg-red-400" title="Call errors" />
                    )}
                  </div>
                )}

                <div className="flex-1" />
                <span className="mr-1 font-mono text-xs text-muted tabular-nums">
                  {formatGas(tx.originalGas)} &rarr; {formatGas(tx.simulatedGas)}
                </span>
                <span className={clsx('font-mono text-xs font-bold tabular-nums', getDeltaColor(tx.deltaPercent))}>
                  {formatDelta(tx.deltaPercent)}
                </span>
              </button>

              {/* Expanded detail section */}
              {isExpanded && (
                <div className="mt-1 mb-2 ml-5 rounded-xs border-l-2 border-border/40 bg-surface/20 p-3">
                  {/* Detail grid */}
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted">Status</dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {statusChanged ? (
                          <span className="text-red-500">
                            {tx.originalStatus === 'success' ? 'Success' : 'Failed'} &rarr;{' '}
                            {tx.simulatedStatus === 'success' ? 'Success' : 'Failed'}
                          </span>
                        ) : (
                          <span className={tx.originalStatus === 'success' ? 'text-green-500' : 'text-red-400'}>
                            {tx.originalStatus === 'success' ? 'Success' : 'Failed'}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Diverged</dt>
                      <dd className="mt-1 text-sm font-semibold">
                        <Tooltip
                          title="Execution Divergence"
                          description={
                            tx.diverged
                              ? statusChanged
                                ? `The modified gas costs caused this transaction to follow a different execution path, changing its outcome from ${tx.originalStatus === 'success' ? 'success' : 'failure'} to ${tx.simulatedStatus === 'success' ? 'success' : 'failure'}. This means the gas change would materially affect this transaction's behavior on-chain.`
                                : hasErrors && tx.originalErrors.length !== tx.simulatedErrors.length
                                  ? 'The modified gas costs caused this transaction to hit different internal call errors. While the final outcome stayed the same, the execution path diverged \u2014 some internal calls that previously succeeded now fail, or vice versa.'
                                  : 'The modified gas costs caused opcodes to execute a different number of times, meaning the transaction took a different code path. The final outcome was unchanged, but the internal execution flow diverged.'
                              : 'This transaction executed identically under both gas schedules \u2014 same opcode counts, same call results, same outcome. The gas cost change had no effect on its execution path.'
                          }
                        >
                          {tx.diverged ? (
                            <span className="cursor-help text-amber-500 underline decoration-amber-500/30 decoration-dotted underline-offset-2">
                              Yes
                            </span>
                          ) : (
                            <span className="cursor-help text-muted underline decoration-border decoration-dotted underline-offset-2">
                              No
                            </span>
                          )}
                        </Tooltip>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Gas Impact</dt>
                      <dd
                        className={clsx(
                          'mt-1 font-mono text-sm font-semibold tabular-nums',
                          getDeltaColor(tx.deltaPercent)
                        )}
                      >
                        {tx.deltaPercent > 0 ? '+' : tx.deltaPercent < 0 ? '\u2212' : ''}
                        {formatGas(absDelta)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Call Errors</dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {hasErrors ? (
                          <span className="text-red-400">
                            {tx.originalErrors.length} &rarr; {tx.simulatedErrors.length}
                          </span>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {/* Error cards (if any) */}
                  {hasErrors && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <ErrorCard label="Original" errors={tx.originalErrors} variant="original" />
                      <ErrorCard label="Simulated" errors={tx.simulatedErrors} variant="simulated" />
                    </div>
                  )}

                  {/* Action links */}
                  <div className="mt-3 flex items-center gap-3 border-t border-border/20 pt-3">
                    <Link
                      to="/ethereum/execution/gas-profiler/tx/$txHash"
                      params={{ txHash: tx.hash }}
                      search={{ block: blockNumber }}
                      className="rounded-sm bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      View tx details &rarr;
                    </Link>
                    <div className="ml-auto flex items-center gap-2">
                      <a
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
                        title="View tx on Etherscan"
                      >
                        <EtherscanIcon className="size-4" />
                      </a>
                      <a
                        href={`https://dashboard.tenderly.co/tx/1/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-surface p-1.5 transition-colors hover:opacity-80"
                        title="View tx on Tenderly"
                      >
                        <TenderlyIcon className="size-4" />
                      </a>
                      <a
                        href={`https://phalcon.blocksec.com/explorer/tx/eth/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
                        title="View tx on Phalcon"
                      >
                        <PhalconIcon className="size-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {filteredAndSorted.length > visibleCount && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisibleCount(filteredAndSorted.length)}
            className="flex items-center gap-2 rounded-xs border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
          >
            Show All ({filteredAndSorted.length - visibleCount} more)
          </button>
        </div>
      )}

      {filteredAndSorted.length === 0 && (
        <div className="py-12 text-center text-sm text-muted">No transactions match the selected filter.</div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BlockSimulationResultsV2({
  result,
  modifiedParams,
  className,
}: BlockSimulationResultsV2Props): JSX.Element {
  // Overall gas delta
  const overallDelta = useMemo(() => {
    if (result.original.gasUsed === 0) return 0;
    return ((result.simulated.gasUsed - result.original.gasUsed) / result.original.gasUsed) * 100;
  }, [result.original.gasUsed, result.simulated.gasUsed]);

  // Divergence summary
  const divergenceSummary = useMemo(() => {
    const divergedCount = result.transactions.filter(tx => tx.diverged).length;
    const statusChanges = result.transactions.filter(tx => tx.originalStatus !== tx.simulatedStatus).length;
    const totalOriginalReverts = result.transactions.reduce((sum, tx) => sum + tx.originalReverts, 0);
    const totalSimulatedReverts = result.transactions.reduce((sum, tx) => sum + tx.simulatedReverts, 0);
    return {
      divergedCount,
      statusChanges,
      totalOriginalReverts,
      totalSimulatedReverts,
      additionalReverts: totalSimulatedReverts - totalOriginalReverts,
    };
  }, [result.transactions]);

  // Opcode data with categories
  const { categoryData, maxGas } = useMemo(() => {
    const opcodes: OpcodeRowData[] = Object.entries(result.opcodeBreakdown)
      .map(([opcode, summary]: [string, OpcodeSummary]) => {
        const delta =
          summary.originalGas > 0
            ? ((summary.simulatedGas - summary.originalGas) / summary.originalGas) * 100
            : summary.simulatedGas > 0
              ? 100
              : 0;
        const category = getOpcodeCategory(opcode);
        return {
          opcode,
          category,
          categoryColor: CATEGORY_COLORS[category] || '#9ca3af',
          originalCount: summary.originalCount,
          simulatedCount: summary.simulatedCount,
          originalGas: summary.originalGas,
          simulatedGas: summary.simulatedGas,
          delta,
          absDelta: Math.abs(summary.simulatedGas - summary.originalGas),
        };
      })
      .filter(o => o.originalGas > 0 || o.simulatedGas > 0);

    const maxGas = Math.max(...opcodes.map(o => Math.max(o.originalGas, o.simulatedGas)), 1);

    // Group by category
    const catMap = new Map<
      string,
      { name: string; color: string; totalOriginal: number; totalSimulated: number; opcodes: OpcodeRowData[] }
    >();
    for (const op of opcodes) {
      const existing = catMap.get(op.category);
      if (existing) {
        existing.totalOriginal += op.originalGas;
        existing.totalSimulated += op.simulatedGas;
        existing.opcodes.push(op);
      } else {
        catMap.set(op.category, {
          name: op.category,
          color: op.categoryColor,
          totalOriginal: op.originalGas,
          totalSimulated: op.simulatedGas,
          opcodes: [op],
        });
      }
    }

    const categories: CategoryGroup[] = Array.from(catMap.values())
      .map(cat => ({
        ...cat,
        delta: cat.totalOriginal > 0 ? ((cat.totalSimulated - cat.totalOriginal) / cat.totalOriginal) * 100 : 0,
      }))
      .sort((a, b) => Math.max(b.totalSimulated, b.totalOriginal) - Math.max(a.totalSimulated, a.totalOriginal));

    // Sort opcodes within each category by absolute delta
    for (const cat of categories) {
      cat.opcodes.sort((a, b) => b.absDelta - a.absDelta);
    }

    return { categoryData: categories, maxGas };
  }, [result.opcodeBreakdown]);

  return (
    <div className={clsx(className)}>
      <TabGroup>
        <div className="flex items-center justify-between gap-4 border-b border-border">
          <ScrollableTabs className="border-b-0">
            <Tab>Summary</Tab>
            <Tab>Opcode Breakdown</Tab>
            <Tab>Transactions</Tab>
          </ScrollableTabs>
          <div className="flex items-center gap-2 pb-2">
            <a
              href={`https://etherscan.io/block/${result.blockNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
              title="View block on Etherscan"
            >
              <EtherscanIcon className="size-4" />
            </a>
            <a
              href={`https://dashboard.tenderly.co/block/1/${result.blockNumber}/txs`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-surface p-1.5 transition-colors hover:opacity-80"
              title="View block on Tenderly"
            >
              <TenderlyIcon className="size-4" />
            </a>
          </div>
        </div>

        <TabPanels className="mt-6">
          {/* ============================================================ */}
          {/* SUMMARY TAB */}
          {/* ============================================================ */}
          <TabPanel className="space-y-6">
            {/* Gas Comparison */}
            <Card className="p-4">
              <GasComparisonSection result={result} overallDelta={overallDelta} />
            </Card>

            {/* Execution Health */}
            <ExecutionHealthSection
              divergenceSummary={divergenceSummary}
              totalTransactions={result.transactions.length}
            />
          </TabPanel>

          {/* ============================================================ */}
          {/* OPCODE BREAKDOWN TAB */}
          {/* ============================================================ */}
          <TabPanel>
            {categoryData.length > 0 && (
              <OpcodeBreakdownSection categoryData={categoryData} maxGas={maxGas} modifiedParams={modifiedParams} />
            )}
          </TabPanel>

          {/* ============================================================ */}
          {/* TRANSACTIONS TAB */}
          {/* ============================================================ */}
          <TabPanel>
            <TransactionImpactView transactions={result.transactions} blockNumber={result.blockNumber} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
