import { type JSX, type ReactNode, useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Sparkline } from '@/components/Charts/Sparkline';
import type {
  ValidatorMetrics,
  AttestationDailyDataPoint,
  BalanceDailyDataPoint,
  SyncCommitteeDailyDataPoint,
  BlockProposalDataPoint,
} from '../../hooks/useValidatorsData.types';
import { DailyBreakdownTable } from '../DailyBreakdownTable';
import type { ValidatorSelection } from '../ValidatorHeatmap';

interface ValidatorTableProps {
  /** Array of validator metrics */
  validators: ValidatorMetrics[];
  /** Daily attestation data for sparklines and expanded breakdown */
  attestationDaily: AttestationDailyDataPoint[];
  /** Daily balance data for sparklines and expanded breakdown */
  balanceDaily: BalanceDailyDataPoint[];
  /** Daily sync committee data for expanded breakdown */
  syncCommitteeDaily: SyncCommitteeDailyDataPoint[];
  /** Block proposal data points */
  blockProposals?: BlockProposalDataPoint[];
  /** Map of validator index to pubkey */
  validatorMap?: Map<number, string>;
  /** Start of the selected date range (Unix seconds) */
  from?: number;
  /** End of the selected date range (Unix seconds) */
  to?: number;
  /** Look up validator status at a given timestamp */
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Controlled selection state for heatmap ↔ table sync */
  selection?: ValidatorSelection;
  /** Callback when a validator row or breakdown is selected */
  onValidatorSelect?: (selection: ValidatorSelection) => void;
  /** Additional class names */
  className?: string;
}

/** Truncate a pubkey to first 6 + last 4 hex chars: 0xab12...cdef */
function truncatePubkey(pubkey: string): string {
  if (pubkey.length < 12) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
}

/**
 * Format percentage with color based on threshold
 */
function formatPercent(value: number, threshold = 95): ReactNode {
  const formatted = `${value.toFixed(2)}%`;
  return (
    <span
      className={clsx(
        'tabular-nums',
        value >= threshold ? 'text-success' : value >= 90 ? 'text-warning' : 'text-danger'
      )}
    >
      {formatted}
    </span>
  );
}

/**
 * Format ETH balance
 */
function formatEth(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(4)}`;
}

/**
 * Format status badge
 */
function formatStatus(status: string, slashed: boolean): ReactNode {
  if (slashed) {
    return <span className="rounded-xs bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">Slashed</span>;
  }

  const statusColors: Record<string, string> = {
    active_ongoing: 'bg-success/10 text-success',
    active_exiting: 'bg-warning/10 text-warning',
    active_slashed: 'bg-danger/10 text-danger',
    exited_unslashed: 'bg-muted/10 text-muted',
    exited_slashed: 'bg-danger/10 text-danger',
    withdrawal_possible: 'bg-accent/10 text-accent',
    withdrawal_done: 'bg-muted/10 text-muted',
    pending_initialized: 'bg-accent/10 text-accent',
    pending_queued: 'bg-accent/10 text-accent',
  };

  const colorClass = statusColors[status] ?? 'bg-muted/10 text-muted';
  const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return <span className={clsx('rounded-xs px-2 py-0.5 text-xs font-medium', colorClass)}>{displayStatus}</span>;
}

/** Column count for colSpan on expanded rows */
const COLUMN_COUNT = 17;

/**
 * Table displaying per-validator performance metrics with sparkline trends
 * and expandable daily breakdown rows
 */
export function ValidatorTable({
  validators,
  attestationDaily,
  balanceDaily,
  syncCommitteeDaily,
  blockProposals = [],
  validatorMap,
  from,
  to,
  getStatusAtTimestamp,
  isLoading = false,
  selection,
  onValidatorSelect,
  className,
}: ValidatorTableProps): JSX.Element {
  const [internalExpanded, setInternalExpanded] = useState<number | null>(null);
  const expandedValidator = selection ? selection.validatorIndex : internalExpanded;

  // Pre-build per-validator lookup maps for daily data
  const attestationByValidator = useMemo(() => {
    const map = new Map<number, AttestationDailyDataPoint[]>();
    for (const point of attestationDaily) {
      const existing = map.get(point.validatorIndex);
      if (existing) {
        existing.push(point);
      } else {
        map.set(point.validatorIndex, [point]);
      }
    }
    // Sort each validator's data by timestamp
    for (const points of map.values()) {
      points.sort((a, b) => a.timestamp - b.timestamp);
    }
    return map;
  }, [attestationDaily]);

  const balanceByValidator = useMemo(() => {
    const map = new Map<number, BalanceDailyDataPoint[]>();
    for (const point of balanceDaily) {
      const existing = map.get(point.validatorIndex);
      if (existing) {
        existing.push(point);
      } else {
        map.set(point.validatorIndex, [point]);
      }
    }
    // Sort each validator's data by timestamp
    for (const points of map.values()) {
      points.sort((a, b) => a.timestamp - b.timestamp);
    }
    return map;
  }, [balanceDaily]);

  const syncByValidator = useMemo(() => {
    const map = new Map<number, SyncCommitteeDailyDataPoint[]>();
    for (const point of syncCommitteeDaily) {
      const existing = map.get(point.validatorIndex);
      if (existing) {
        existing.push(point);
      } else {
        map.set(point.validatorIndex, [point]);
      }
    }
    for (const points of map.values()) {
      points.sort((a, b) => a.timestamp - b.timestamp);
    }
    return map;
  }, [syncCommitteeDaily]);

  const proposalsByValidator = useMemo(() => {
    const map = new Map<number, BlockProposalDataPoint[]>();
    for (const point of blockProposals) {
      const existing = map.get(point.validatorIndex);
      if (existing) {
        existing.push(point);
      } else {
        map.set(point.validatorIndex, [point]);
      }
    }
    return map;
  }, [blockProposals]);

  const handleRowClick = (validatorIndex: number): void => {
    if (onValidatorSelect) {
      const isCollapsing = expandedValidator === validatorIndex;
      onValidatorSelect({
        validatorIndex: isCollapsing ? null : validatorIndex,
        dayTimestamp: null,
        hourTimestamp: null,
      });
    } else {
      setInternalExpanded(prev => (prev === validatorIndex ? null : validatorIndex));
    }
  };

  if (isLoading) {
    return (
      <div className={clsx('rounded-sm border border-border bg-surface', className)}>
        <div className="p-8 text-center text-muted">Loading validator data...</div>
      </div>
    );
  }

  if (validators.length === 0) {
    return (
      <div className={clsx('rounded-sm border border-border bg-surface', className)}>
        <div className="p-8 text-center text-muted">No validators to display</div>
      </div>
    );
  }

  return (
    <div className={clsx('overflow-x-auto rounded-sm border border-border bg-surface', className)}>
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-border bg-surface text-xs text-muted">
            <th className="w-px px-2 py-3" />
            <th className="px-2 py-3 text-left font-medium">Validator</th>
            <th className="w-px px-2 py-3 text-right font-medium">Inclusion</th>
            <th className="w-px px-2 py-3 text-center font-medium">Incl. Trend</th>
            <th className="hidden w-px px-2 py-3 text-right font-medium lg:table-cell">Head</th>
            <th className="hidden w-px px-2 py-3 text-center font-medium lg:table-cell">Head Trend</th>
            <th className="hidden w-px px-2 py-3 text-right font-medium lg:table-cell">Target</th>
            <th className="hidden w-px px-2 py-3 text-center font-medium lg:table-cell">Target Trend</th>
            <th className="hidden w-px px-2 py-3 text-right font-medium xl:table-cell">Source</th>
            <th className="hidden w-px px-2 py-3 text-center font-medium xl:table-cell">Source Trend</th>
            <th className="hidden w-px px-2 py-3 text-right font-medium xl:table-cell">Avg Delay</th>
            <th className="hidden w-px px-2 py-3 text-center font-medium xl:table-cell">Delay Trend</th>
            <th className="w-px px-2 py-3 text-right font-medium">Sync %</th>
            <th className="hidden w-px px-2 py-3 text-right font-medium lg:table-cell">Proposals</th>
            <th className="w-px px-2 py-3 text-right font-medium">Min Bal (ETH)</th>
            <th className="w-px px-2 py-3 text-center font-medium">Bal. Trend</th>
            <th className="w-px px-2 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {validators.map(row => {
            const isExpanded = expandedValidator === row.validatorIndex;
            const attDaily = attestationByValidator.get(row.validatorIndex);
            const balDaily = balanceByValidator.get(row.validatorIndex);
            const syncDaily = syncByValidator.get(row.validatorIndex);
            const valProposals = proposalsByValidator.get(row.validatorIndex);

            // Extract sparkline data arrays
            const inclusionSparkline = attDaily?.map(d => d.inclusionRate) ?? [];
            const headSparkline = attDaily?.map(d => d.headCorrectRate) ?? [];
            const targetSparkline = attDaily?.map(d => d.targetCorrectRate) ?? [];
            const sourceSparkline = attDaily?.map(d => d.sourceCorrectRate) ?? [];
            const delaySparkline = attDaily?.map(d => d.avgInclusionDistance) ?? [];
            const balanceSparkline = balDaily?.map(d => d.balance) ?? [];

            return (
              <ValidatorRow
                key={row.validatorIndex}
                row={row}
                isExpanded={isExpanded}
                isHighlighted={selection?.validatorIndex === row.validatorIndex}
                pubkey={validatorMap?.get(row.validatorIndex)}
                inclusionSparkline={inclusionSparkline}
                headSparkline={headSparkline}
                targetSparkline={targetSparkline}
                sourceSparkline={sourceSparkline}
                delaySparkline={delaySparkline}
                balanceSparkline={balanceSparkline}
                attestationDaily={attDaily ?? []}
                balanceDaily={balDaily ?? []}
                syncCommitteeDaily={syncDaily ?? []}
                blockProposals={valProposals ?? []}
                from={from}
                to={to}
                getStatusAtTimestamp={getStatusAtTimestamp}
                selectedDayTimestamp={isExpanded ? selection?.dayTimestamp : undefined}
                selectedHourTimestamp={isExpanded ? selection?.hourTimestamp : undefined}
                onDaySelect={
                  onValidatorSelect
                    ? (dayTs: number | null) =>
                        onValidatorSelect({
                          validatorIndex: row.validatorIndex,
                          dayTimestamp: dayTs,
                          hourTimestamp: null,
                        })
                    : undefined
                }
                onHourSelect={
                  onValidatorSelect
                    ? (hourTs: number | null) =>
                        onValidatorSelect({
                          validatorIndex: row.validatorIndex,
                          dayTimestamp: selection?.dayTimestamp ?? null,
                          hourTimestamp: hourTs,
                        })
                    : undefined
                }
                onClick={() => handleRowClick(row.validatorIndex)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ValidatorRowProps {
  row: ValidatorMetrics;
  isExpanded: boolean;
  isHighlighted: boolean;
  pubkey?: string;
  inclusionSparkline: (number | null)[];
  headSparkline: (number | null)[];
  targetSparkline: (number | null)[];
  sourceSparkline: (number | null)[];
  delaySparkline: (number | null)[];
  balanceSparkline: (number | null)[];
  attestationDaily: AttestationDailyDataPoint[];
  balanceDaily: BalanceDailyDataPoint[];
  syncCommitteeDaily: SyncCommitteeDailyDataPoint[];
  blockProposals: BlockProposalDataPoint[];
  from?: number;
  to?: number;
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  selectedDayTimestamp?: number | null;
  selectedHourTimestamp?: number | null;
  onDaySelect?: (dayTimestamp: number | null) => void;
  onHourSelect?: (hourTimestamp: number | null) => void;
  onClick: () => void;
}

/**
 * Single validator row with optional expanded daily breakdown
 */
function ValidatorRow({
  row,
  isExpanded,
  isHighlighted,
  pubkey,
  inclusionSparkline,
  headSparkline,
  targetSparkline,
  sourceSparkline,
  delaySparkline,
  balanceSparkline,
  attestationDaily,
  balanceDaily,
  syncCommitteeDaily,
  blockProposals,
  from,
  to,
  getStatusAtTimestamp,
  selectedDayTimestamp,
  selectedHourTimestamp,
  onDaySelect,
  onHourSelect,
  onClick,
}: ValidatorRowProps): JSX.Element {
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Auto-scroll into view when this row becomes highlighted externally
  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isHighlighted]);

  return (
    <>
      <tr
        ref={rowRef}
        className={clsx(
          'cursor-pointer border-b border-border/50 transition-colors hover:bg-surface/80',
          row.balance.slashed && 'bg-danger/5',
          isExpanded && 'bg-surface/50',
          isHighlighted && 'border-l-2 border-l-primary bg-primary/5'
        )}
        onClick={onClick}
      >
        {/* Chevron */}
        <td className="px-2 py-2">
          {isExpanded ? (
            <ChevronDownIcon className="size-4 text-primary" />
          ) : (
            <ChevronRightIcon className="size-4 text-muted" />
          )}
        </td>

        {/* Validator index + pubkey */}
        <td className="px-2 py-2 font-mono">
          <span className="flex items-baseline gap-1.5">
            <span className="font-medium text-foreground">{row.validatorIndex}</span>
            {pubkey && (
              <span className="text-xs text-muted" title={pubkey}>
                <span className="2xl:hidden">{truncatePubkey(pubkey)}</span>
                <span className="hidden 2xl:inline">{pubkey}</span>
              </span>
            )}
          </span>
        </td>

        {/* Inclusion rate */}
        <td className="px-2 py-2 text-right">{formatPercent(row.attestation.inclusionRate)}</td>

        {/* Inclusion sparkline */}
        <td className="px-2 py-2 text-center">
          {inclusionSparkline.length > 1 ? (
            <div className="mx-auto w-fit">
              <Sparkline data={inclusionSparkline} width={80} />
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Head */}
        <td className="hidden px-2 py-2 text-right lg:table-cell">
          {formatPercent(row.attestation.headCorrectRate, 98)}
        </td>

        {/* Head sparkline */}
        <td className="hidden px-2 py-2 text-center lg:table-cell">
          {headSparkline.length > 1 ? (
            <div className="mx-auto w-fit">
              <Sparkline data={headSparkline} width={80} />
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Target */}
        <td className="hidden px-2 py-2 text-right lg:table-cell">
          {formatPercent(row.attestation.targetCorrectRate, 98)}
        </td>

        {/* Target sparkline */}
        <td className="hidden px-2 py-2 text-center lg:table-cell">
          {targetSparkline.length > 1 ? (
            <div className="mx-auto w-fit">
              <Sparkline data={targetSparkline} width={80} />
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Source */}
        <td className="hidden px-2 py-2 text-right xl:table-cell">
          {formatPercent(row.attestation.sourceCorrectRate, 98)}
        </td>

        {/* Source sparkline */}
        <td className="hidden px-2 py-2 text-center xl:table-cell">
          {sourceSparkline.length > 1 ? (
            <div className="mx-auto w-fit">
              <Sparkline data={sourceSparkline} width={80} />
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Avg Delay */}
        <td className="hidden px-2 py-2 text-right xl:table-cell">
          {row.attestation.avgInclusionDistance !== null ? (
            <span className="tabular-nums">{row.attestation.avgInclusionDistance.toFixed(2)}</span>
          ) : (
            '-'
          )}
        </td>

        {/* Delay sparkline */}
        <td className="hidden px-2 py-2 text-center xl:table-cell">
          {delaySparkline.length > 1 ? (
            <div className="mx-auto w-fit">
              <Sparkline data={delaySparkline} width={80} />
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Sync % */}
        <td className="px-2 py-2 text-right">
          {row.syncCommittee ? (
            formatPercent(row.syncCommittee.participationRate)
          ) : (
            <span className="text-muted">N/A</span>
          )}
        </td>

        {/* Proposals */}
        <td className="hidden px-2 py-2 text-right lg:table-cell">
          {row.blockProposal ? (
            <span
              className={clsx(
                'tabular-nums',
                row.blockProposal.missedCount > 0
                  ? 'text-danger'
                  : row.blockProposal.orphanedCount > 0
                    ? 'text-warning'
                    : 'text-success'
              )}
            >
              {row.blockProposal.canonicalCount}/{row.blockProposal.totalProposals}
            </span>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Min Balance */}
        <td className="px-2 py-2 text-right">
          <span className="tabular-nums">{formatEth(row.balance.minBalance)}</span>
        </td>

        {/* Balance sparkline */}
        <td className="px-2 py-2 text-center">
          {balanceSparkline.length > 1 ? (
            <div className="mx-auto w-fit">
              <Sparkline data={balanceSparkline} width={80} showArea color="#22c55e" />
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>

        {/* Status */}
        <td className="px-2 py-2">{formatStatus(row.balance.status, row.balance.slashed)}</td>
      </tr>

      {/* Expanded daily breakdown */}
      {isExpanded && (
        <tr className="bg-background">
          <td colSpan={COLUMN_COUNT} className="px-4 py-3">
            <DailyBreakdownTable
              attestationData={attestationDaily}
              balanceData={balanceDaily}
              syncCommitteeData={syncCommitteeDaily}
              blockProposals={blockProposals}
              validatorIndex={row.validatorIndex}
              from={from}
              to={to}
              getStatusAtTimestamp={getStatusAtTimestamp}
              selectedDayTimestamp={selectedDayTimestamp}
              selectedHourTimestamp={selectedHourTimestamp}
              onDaySelect={onDaySelect}
              onHourSelect={onHourSelect}
            />
          </td>
        </tr>
      )}
    </>
  );
}
