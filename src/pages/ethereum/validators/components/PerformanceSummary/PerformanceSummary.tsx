import type { JSX } from 'react';
import clsx from 'clsx';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats';
import type { AggregateSummary } from '../../hooks/useValidatorsData.types';
import type { StatusSummary } from '../../hooks/useValidatorStatus';

interface ThresholdConfig {
  inclusionRate: number;
  correctnessRate: number;
  syncParticipation: number;
  minBalance: number;
}

interface PerformanceSummaryProps {
  /** Aggregate summary data */
  summary: AggregateSummary | null;
  /** Validator status summary */
  statusSummary?: StatusSummary | null;
  /** Whether status data is still loading */
  isStatusLoading?: boolean;
  /** Threshold configuration */
  thresholds: ThresholdConfig;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/** Skeleton placeholder shown in place of a value while loading */
function ValueSkeleton(): JSX.Element {
  return <span className="block h-8 w-20 animate-pulse rounded-xs bg-muted/20" />;
}

/** Value with an optional `/ threshold%` suffix */
function ValueWithThreshold({ value, threshold }: { value: string; threshold?: number }): JSX.Element {
  return (
    <>
      {value}
      {threshold !== undefined && <span className="ml-2 text-xs font-normal text-muted">/ {threshold}%</span>}
    </>
  );
}

interface StatusBadgeConfig {
  key: keyof Omit<StatusSummary, 'total'>;
  label: string;
  dotClass: string;
  badgeClass: string;
}

const STATUS_BADGES: StatusBadgeConfig[] = [
  { key: 'active', label: 'Active', dotClass: 'bg-foreground', badgeClass: 'bg-foreground/10 text-foreground' },
  { key: 'pending', label: 'Pending', dotClass: 'bg-accent', badgeClass: 'bg-accent/10 text-accent' },
  { key: 'exited', label: 'Exited', dotClass: 'bg-muted', badgeClass: 'bg-muted/10 text-muted' },
  { key: 'withdrawal', label: 'Withdrawal', dotClass: 'bg-muted', badgeClass: 'bg-muted/10 text-muted' },
  { key: 'slashed', label: 'Slashed', dotClass: 'bg-danger', badgeClass: 'bg-danger/10 text-danger' },
  { key: 'unknown', label: 'Unknown', dotClass: 'bg-warning', badgeClass: 'bg-warning/10 text-warning' },
];

/**
 * Format percentage with specified decimals
 */
function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format ETH balance
 */
function formatEth(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(4)} ETH`;
}

/**
 * Summary strip showing aggregate performance metrics across all validators
 */
export function PerformanceSummary({
  summary,
  statusSummary,
  isStatusLoading = false,
  thresholds,
  isLoading = false,
  className,
}: PerformanceSummaryProps): JSX.Element {
  const attestationInclusionRate = summary?.attestation.inclusionRate ?? 0;
  const avgCorrectnessRate = summary
    ? (summary.attestation.headCorrectRate +
        summary.attestation.targetCorrectRate +
        summary.attestation.sourceCorrectRate) /
      3
    : 0;
  const syncParticipationRate = summary?.syncCommittee.participationRate ?? 0;
  const blockProposal = summary?.blockProposal;
  const minBalance = summary?.balance.minBalance ?? null;

  const inclusionPassed = attestationInclusionRate >= thresholds.inclusionRate;
  const correctnessPassed = avgCorrectnessRate >= thresholds.correctnessRate;
  const syncPassed = summary?.syncCommittee.totalSlots === 0 || summary?.syncCommittee.missedCount === 0;
  const hasProposals = (blockProposal?.totalProposals ?? 0) > 0;
  const proposalsPassed = !hasProposals || blockProposal?.canonicalCount === blockProposal?.totalProposals;
  const balancePassed = minBalance === null || minBalance >= thresholds.minBalance;

  const visibleBadges = statusSummary ? STATUS_BADGES.filter(b => statusSummary[b.key] > 0) : [];

  const verdictClass = (passed: boolean): string => (passed ? 'text-foreground' : 'text-danger');

  const stats: Stat[] = [
    {
      id: 'validators',
      name: 'Validators',
      value: isStatusLoading ? <ValueSkeleton /> : (statusSummary?.total ?? 0),
      subtitle: isStatusLoading ? (
        <span className="block h-4 w-32 animate-pulse rounded-xs bg-muted/20" />
      ) : visibleBadges.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {visibleBadges.map(badge => (
            <span
              key={badge.key}
              className={clsx(
                'inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs font-medium',
                badge.badgeClass
              )}
            >
              <span className={clsx('size-1.5 rounded-full', badge.dotClass)} />
              {statusSummary![badge.key]}
            </span>
          ))}
        </span>
      ) : undefined,
    },
    {
      id: 'attestation-inclusion',
      name: 'Attestation Inclusion',
      value: isLoading ? (
        <ValueSkeleton />
      ) : (
        <ValueWithThreshold value={formatPercent(attestationInclusionRate)} threshold={thresholds.inclusionRate} />
      ),
      valueClassName: isLoading ? undefined : verdictClass(inclusionPassed),
      subtitle: `${summary?.attestation.attestedCount ?? 0} / ${summary?.attestation.totalDuties ?? 0} duties`,
    },
    {
      id: 'vote-correctness',
      name: 'Vote Correctness',
      value: isLoading ? (
        <ValueSkeleton />
      ) : (
        <ValueWithThreshold value={formatPercent(avgCorrectnessRate)} threshold={thresholds.correctnessRate} />
      ),
      valueClassName: isLoading ? undefined : verdictClass(correctnessPassed),
      subtitle: (
        <span className="flex flex-wrap gap-x-2 whitespace-normal">
          <span>
            <span className="font-bold lg:hidden">H: </span>
            <span className="hidden font-bold lg:inline">Head: </span>
            {formatPercent(summary?.attestation.headCorrectRate ?? 0, 1)}
          </span>
          <span>
            <span className="font-bold lg:hidden">T: </span>
            <span className="hidden font-bold lg:inline">Target: </span>
            {formatPercent(summary?.attestation.targetCorrectRate ?? 0, 1)}
          </span>
          <span>
            <span className="font-bold lg:hidden">S: </span>
            <span className="hidden font-bold lg:inline">Source: </span>
            {formatPercent(summary?.attestation.sourceCorrectRate ?? 0, 1)}
          </span>
        </span>
      ),
    },
    {
      id: 'sync-committee',
      name: 'Sync Committee',
      value: isLoading ? (
        <ValueSkeleton />
      ) : (
        <ValueWithThreshold
          value={summary?.syncCommittee.totalSlots === 0 ? 'N/A' : formatPercent(syncParticipationRate)}
          threshold={summary?.syncCommittee.totalSlots === 0 ? undefined : thresholds.syncParticipation}
        />
      ),
      valueClassName: isLoading ? undefined : verdictClass(syncPassed),
      subtitle:
        summary?.syncCommittee.totalSlots === 0
          ? 'No duties in period'
          : `${summary?.syncCommittee.participatedCount ?? 0} / ${summary?.syncCommittee.totalSlots ?? 0} slots`,
    },
    {
      id: 'block-proposals',
      name: 'Block Proposals',
      value: isLoading ? (
        <ValueSkeleton />
      ) : hasProposals ? (
        `${blockProposal!.canonicalCount} / ${blockProposal!.totalProposals}`
      ) : (
        'N/A'
      ),
      valueClassName: isLoading ? undefined : verdictClass(proposalsPassed),
      subtitle: hasProposals
        ? [
            blockProposal!.missedCount > 0 && `${blockProposal!.missedCount} missed`,
            blockProposal!.orphanedCount > 0 && `${blockProposal!.orphanedCount} orphaned`,
          ]
            .filter(Boolean)
            .join(', ') || 'All canonical'
        : 'No proposals in period',
    },
    {
      id: 'min-balance',
      name: 'Min Balance',
      value: isLoading ? <ValueSkeleton /> : formatEth(minBalance),
      valueClassName: isLoading ? undefined : verdictClass(balancePassed),
      subtitle: `Across ${summary?.totalValidators ?? 0} validators`,
    },
  ];

  return <Stats stats={stats} className={className} gridClassName="grid grid-cols-2 lg:grid-cols-3" />;
}
