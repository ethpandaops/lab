import type { JSX } from 'react';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats';
import type { AggregateSummary } from '../../hooks/useValidatorsData.types';

interface PerformanceSummaryProps {
  /** Aggregate summary data */
  summary: AggregateSummary | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/** Skeleton placeholder shown in place of a value while loading */
function ValueSkeleton(): JSX.Element {
  return <span className="block h-8 w-20 animate-pulse rounded-xs bg-muted-20" />;
}

/** Percentage with the given decimals; a dash when there is no rate */
function formatPercent(value: number | null, decimals = 2): string {
  return value === null ? '—' : `${value.toFixed(decimals)}%`;
}

/**
 * Format ETH balance
 */
function formatEth(value: number | null): string {
  if (value === null) return '—';
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH`;
}

/**
 * Summary strip showing aggregate performance metrics across all validators
 */
export function PerformanceSummary({ summary, isLoading = false, className }: PerformanceSummaryProps): JSX.Element {
  const attestation = summary?.attestation;
  const inclusionRate = attestation?.inclusionRate ?? null;
  const attested = attestation?.attestedCount ?? 0;
  const sourceKnown = (attestation?.sourceCorrectCount ?? 0) + (attestation?.sourceIncorrectCount ?? 0);
  /** Subtitle of a vote: correct out of counted, or why there is no rate */
  const voteSubtitle = (correct: number, total: number, counted: string): string =>
    total > 0
      ? `${correct} of ${total} ${counted}`
      : inclusionRate === null
        ? 'No duties in range'
        : attested === 0
          ? 'No attestations in range'
          : 'None seen on gossip';
  const syncRate = summary?.syncCommittee.participationRate ?? null;
  const blockProposal = summary?.blockProposal;
  const hasProposals = (blockProposal?.totalProposals ?? 0) > 0;
  const minBalance = summary?.balance.minBalance ?? null;
  const value = (text: string): JSX.Element | string => (isLoading ? <ValueSkeleton /> : text);

  const stats: Stat[] = [
    {
      id: 'attestation-inclusion',
      name: 'Attestation Inclusion',
      value: value(formatPercent(inclusionRate)),
      subtitle:
        inclusionRate === null
          ? 'No duties in range'
          : `${attestation?.attestedCount ?? 0} / ${attestation?.totalDuties ?? 0} duties`,
    },
    {
      id: 'head-correct',
      name: 'Head Correct',
      value: value(formatPercent(attestation?.headCorrectRate ?? null)),
      subtitle: voteSubtitle(attestation?.headCorrectCount ?? 0, attested, 'attestations'),
    },
    {
      id: 'target-correct',
      name: 'Target Correct',
      value: value(formatPercent(attestation?.targetCorrectRate ?? null)),
      subtitle: voteSubtitle(attestation?.targetCorrectCount ?? 0, attested, 'attestations'),
    },
    {
      id: 'source-correct',
      name: 'Source Correct',
      value: value(formatPercent(attestation?.sourceCorrectRate ?? null)),
      subtitle: voteSubtitle(attestation?.sourceCorrectCount ?? 0, sourceKnown, 'seen on gossip'),
    },
    {
      id: 'sync-committee',
      name: 'Sync Committee',
      value: value(formatPercent(syncRate)),
      subtitle:
        syncRate === null
          ? 'No duties in range'
          : `${summary?.syncCommittee.participatedCount ?? 0} / ${summary?.syncCommittee.totalSlots ?? 0} slots`,
    },
    {
      id: 'block-proposals',
      name: 'Block Proposals',
      value: value(hasProposals ? `${blockProposal!.canonicalCount} / ${blockProposal!.totalProposals}` : '—'),
      subtitle: hasProposals
        ? [
            blockProposal!.missedCount > 0 && `${blockProposal!.missedCount} missed`,
            blockProposal!.orphanedCount > 0 && `${blockProposal!.orphanedCount} orphaned`,
            blockProposal!.missedOrOrphanedCount > 0 && `${blockProposal!.missedOrOrphanedCount} missed or orphaned`,
          ]
            .filter(Boolean)
            .join(', ') || 'All canonical'
        : 'No proposals in range',
    },
    {
      id: 'min-balance',
      name: 'Min Balance',
      value: value(formatEth(minBalance)),
      subtitle: (summary?.totalValidators ?? 0) > 1 ? 'Lowest of any validator' : undefined,
    },
  ];

  return <Stats stats={stats} className={className} gridClassName="grid grid-cols-2 sm:grid-cols-4" />;
}
