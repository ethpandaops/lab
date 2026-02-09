import type { JSX, ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
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

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: ReactNode;
  threshold?: number;
  isLoading?: boolean;
  passed?: boolean;
}

/**
 * Individual metric card component
 */
function MetricCard({ title, value, subtitle, threshold, isLoading, passed }: MetricCardProps): JSX.Element {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="text-xs font-medium tracking-wider text-muted uppercase">{title}</div>
      <div className="flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded-sm bg-muted/20" />
        ) : (
          <span
            className={clsx(
              'text-2xl font-bold tabular-nums',
              passed === undefined ? 'text-foreground' : passed ? 'text-success' : 'text-danger'
            )}
          >
            {value}
          </span>
        )}
        {threshold !== undefined && !isLoading && <span className="text-xs text-muted">/ {threshold}%</span>}
      </div>
      {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
    </Card>
  );
}

interface StatusBadgeConfig {
  key: keyof Omit<StatusSummary, 'total'>;
  label: string;
  dotClass: string;
  badgeClass: string;
}

const STATUS_BADGES: StatusBadgeConfig[] = [
  { key: 'active', label: 'Active', dotClass: 'bg-success', badgeClass: 'bg-success/10 text-success' },
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
 * Summary cards showing aggregate performance metrics across all validators
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

  return (
    <div className={clsx('grid grid-cols-2 gap-4 lg:grid-cols-3', className)}>
      <Card className="flex flex-col gap-1 p-4">
        <div className="text-xs font-medium tracking-wider text-muted uppercase">Validators</div>
        <div className="flex items-baseline gap-2">
          {isStatusLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-sm bg-muted/20" />
          ) : (
            <span className="text-2xl font-bold text-foreground tabular-nums">{statusSummary?.total ?? 0}</span>
          )}
        </div>
        {isStatusLoading ? (
          <div className="h-4 w-32 animate-pulse rounded-sm bg-muted/20" />
        ) : visibleBadges.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
        ) : null}
      </Card>

      <MetricCard
        title="Attestation Inclusion"
        value={formatPercent(attestationInclusionRate)}
        subtitle={`${summary?.attestation.attestedCount ?? 0} / ${summary?.attestation.totalDuties ?? 0} duties`}
        threshold={thresholds.inclusionRate}
        isLoading={isLoading}
        passed={isLoading ? undefined : inclusionPassed}
      />

      <MetricCard
        title="Vote Correctness"
        value={formatPercent(avgCorrectnessRate)}
        subtitle={
          <span className="flex flex-wrap gap-x-2">
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
        }
        threshold={thresholds.correctnessRate}
        isLoading={isLoading}
        passed={isLoading ? undefined : correctnessPassed}
      />

      <MetricCard
        title="Sync Committee"
        value={summary?.syncCommittee.totalSlots === 0 ? 'N/A' : formatPercent(syncParticipationRate)}
        subtitle={
          summary?.syncCommittee.totalSlots === 0
            ? 'No duties in period'
            : `${summary?.syncCommittee.participatedCount ?? 0} / ${summary?.syncCommittee.totalSlots ?? 0} slots`
        }
        threshold={summary?.syncCommittee.totalSlots === 0 ? undefined : thresholds.syncParticipation}
        isLoading={isLoading}
        passed={isLoading ? undefined : syncPassed}
      />

      <MetricCard
        title="Block Proposals"
        value={hasProposals ? `${blockProposal!.canonicalCount} / ${blockProposal!.totalProposals}` : 'N/A'}
        subtitle={
          hasProposals
            ? [
                blockProposal!.missedCount > 0 && `${blockProposal!.missedCount} missed`,
                blockProposal!.orphanedCount > 0 && `${blockProposal!.orphanedCount} orphaned`,
              ]
                .filter(Boolean)
                .join(', ') || 'All canonical'
            : 'No proposals in period'
        }
        isLoading={isLoading}
        passed={isLoading ? undefined : proposalsPassed}
      />

      <MetricCard
        title="Min Balance"
        value={formatEth(minBalance)}
        subtitle={`Across ${summary?.totalValidators ?? 0} validators`}
        isLoading={isLoading}
        passed={isLoading ? undefined : balancePassed}
      />
    </div>
  );
}
