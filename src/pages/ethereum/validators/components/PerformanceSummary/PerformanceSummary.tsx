import type { JSX } from 'react';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats';
import type { AggregateSummary } from '../../hooks/useValidatorsData.types';

interface ThresholdConfig {
  inclusionRate: number;
  correctnessRate: number;
  syncParticipation: number;
  minBalance: number;
}

interface PerformanceSummaryProps {
  /** Aggregate summary data */
  summary: AggregateSummary | null;
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
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH`;
}

/**
 * Summary strip showing aggregate performance metrics across all validators
 */
export function PerformanceSummary({
  summary,
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
  const syncPassed = summary?.syncCommittee.totalSlots === 0 || syncParticipationRate >= thresholds.syncParticipation;
  const hasProposals = (blockProposal?.totalProposals ?? 0) > 0;
  const proposalsPassed = !hasProposals || blockProposal?.canonicalCount === blockProposal?.totalProposals;
  const balancePassed = minBalance === null || minBalance >= thresholds.minBalance;

  const verdictClass = (passed: boolean): string => (passed ? 'text-success' : 'text-danger');

  const stats: Stat[] = [
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
        <span className="mt-1 grid grid-cols-3 gap-2 whitespace-normal">
          {(
            [
              ['Head', summary?.attestation.headCorrectRate],
              ['Target', summary?.attestation.targetCorrectRate],
              ['Source', summary?.attestation.sourceCorrectRate],
            ] as const
          ).map(([label, rate]) => (
            <span key={label}>
              <span className="block">{label}</span>
              <span className="block text-foreground tabular-nums">{formatPercent(rate ?? 0, 1)}</span>
            </span>
          ))}
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
      valueClassName: isLoading || summary?.syncCommittee.totalSlots === 0 ? undefined : verdictClass(syncPassed),
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
      valueClassName: isLoading || !hasProposals ? undefined : verdictClass(proposalsPassed),
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
      valueClassName: isLoading || minBalance === null ? undefined : verdictClass(balancePassed),
      subtitle: (summary?.totalValidators ?? 0) > 1 ? 'Lowest of any validator' : undefined,
    },
  ];

  return <Stats stats={stats} className={className} gridClassName="grid grid-cols-2 lg:grid-cols-5" />;
}
