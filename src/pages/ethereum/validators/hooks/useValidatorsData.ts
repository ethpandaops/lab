import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fctAttestationVoteCorrectnessByValidatorDailyServiceList,
  fctAttestationVoteCorrectnessByValidatorWeeklyServiceList,
  fctBlockProposerByValidatorServiceList,
  fctSyncCommitteeParticipationByValidatorDailyServiceList,
  fctSyncCommitteeParticipationByValidatorWeeklyServiceList,
  fctValidatorBalanceDailyServiceList,
  fctValidatorBalanceWeeklyServiceList,
} from '@/api/sdk.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { weekStartOf } from '@/pages/ethereum/validators/utils/week';
import { rollupPeriods } from '@/pages/ethereum/validators/utils/range';
import {
  MISSED_OR_ORPHANED,
  proposalStatus,
  type ProposalStatus,
} from '@/pages/ethereum/validators/utils/proposal-status';
import type {
  FctAttestationVoteCorrectnessByValidatorDaily,
  FctBlockProposerByValidator,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';
import type {
  UseValidatorsDataReturn,
  ValidatorMetrics,
  ValidatorAttestationMetrics,
  ValidatorSyncCommitteeMetrics,
  ValidatorBlockProposalMetrics,
  ValidatorBalanceMetrics,
  AggregateSummary,
  AttestationDailyDataPoint,
  SyncCommitteeDailyDataPoint,
  BalanceDailyDataPoint,
  BlockProposalDataPoint,
} from './useValidatorsData.types';

const API_MAX_PAGE_SIZE = 10_000;
/** Validators per request, so the index list keeps the URL short; page tokens fetch the rows beyond one page */
const VALIDATORS_PER_REQUEST = 250;

type ListFn = Parameters<typeof fetchAllPages>[0];

/** Split an array into chunks of a given size */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Convert Gwei to ETH
 */
function gweiToEth(gwei: number | null | undefined): number | null {
  if (gwei === null || gwei === undefined) return null;
  return gwei / 1_000_000_000;
}

/** Percentage, or null when there is nothing to divide by (no duties, no attestations) */
function safePercentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return (numerator / denominator) * 100;
}

/**
 * Parse YYYY-MM-DD date string to Unix timestamp (start of day UTC)
 */
function dateStringToTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000);
}

/** Sum of a count column over rows */
function total<T>(rows: T[], key: keyof T): number {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

/**
 * Daily rows of the days around a range's whole weeks, added up into one row per validator per partial week and keyed
 * by the week's Monday like a weekly row. `merge` combines one validator's days, oldest first.
 */
function intoWeeks<T extends { validator_index?: number; day_start_date?: string }>(
  days: T[],
  merge: (days: T[]) => Partial<T>
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of [...days].sort((a, b) => (a.day_start_date ?? '').localeCompare(b.day_start_date ?? ''))) {
    const key = `${row.validator_index}:${weekStartOf(row.day_start_date ?? '')}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map(group => ({
    ...group[group.length - 1],
    ...merge(group),
    day_start_date: weekStartOf(group[0].day_start_date ?? ''),
  }));
}

function mergeAttestationDays(
  days: FctAttestationVoteCorrectnessByValidatorDaily[]
): Partial<FctAttestationVoteCorrectnessByValidatorDaily> {
  const attested = total(days, 'attested_count');
  const distance = days.reduce((sum, d) => sum + (d.avg_inclusion_distance ?? 0) * (d.attested_count ?? 0), 0);
  return {
    total_duties: total(days, 'total_duties'),
    attested_count: attested,
    missed_count: total(days, 'missed_count'),
    head_correct_count: total(days, 'head_correct_count'),
    target_correct_count: total(days, 'target_correct_count'),
    source_correct_count: total(days, 'source_correct_count'),
    source_incorrect_count: total(days, 'source_incorrect_count'),
    avg_inclusion_distance: attested > 0 ? distance / attested : null,
  };
}

function mergeSyncDays(
  days: FctSyncCommitteeParticipationByValidatorDaily[]
): Partial<FctSyncCommitteeParticipationByValidatorDaily> {
  return {
    total_slots: total(days, 'total_slots'),
    participated_count: total(days, 'participated_count'),
    missed_count: total(days, 'missed_count'),
  };
}

/** The first day opens the period; everything else (end balance, status) is the last day's */
function mergeBalanceDays(days: FctValidatorBalanceDaily[]): Partial<FctValidatorBalanceDaily> {
  const mins = days.flatMap(d => (d.min_balance == null ? [] : [d.min_balance]));
  const maxes = days.flatMap(d => (d.max_balance == null ? [] : [d.max_balance]));
  return {
    start_balance: days[0].start_balance,
    start_epoch: days[0].start_epoch,
    min_balance: mins.length > 0 ? Math.min(...mins) : undefined,
    max_balance: maxes.length > 0 ? Math.max(...maxes) : undefined,
  };
}

/** Mondays per weekly request, about six years; with 250 validators the URL stays near 6 KB */
const WEEKS_PER_REQUEST = 320;

/**
 * Aggregate attestation data by validator.
 *
 * Source votes are known only for attestations seen on gossip, so the source rate divides correct by correct plus
 * incorrect votes rather than by attestations. Before gossip data starts (2025-02-01 on mainnet) both counts are 0,
 * which leaves the rate unknown rather than 100%.
 */
function aggregateAttestationByValidator(
  data: FctAttestationVoteCorrectnessByValidatorDaily[]
): Map<number, ValidatorAttestationMetrics> {
  const byValidator = new Map<number, ValidatorAttestationMetrics>();
  // Σ(avg inclusion distance × attested) per validator, so the average weighs each attestation once
  const distanceSums = new Map<number, number>();
  const distanceCounts = new Map<number, number>();

  for (const record of data) {
    const validatorIndex = record.validator_index ?? 0;
    const metrics =
      byValidator.get(validatorIndex) ??
      ({
        validatorIndex,
        totalDuties: 0,
        attestedCount: 0,
        missedCount: 0,
        headCorrectCount: 0,
        targetCorrectCount: 0,
        sourceCorrectCount: 0,
        sourceIncorrectCount: 0,
        avgInclusionDistance: null,
        inclusionRate: null,
        headCorrectRate: null,
        targetCorrectRate: null,
        sourceCorrectRate: null,
      } satisfies ValidatorAttestationMetrics);
    metrics.totalDuties += record.total_duties ?? 0;
    metrics.attestedCount += record.attested_count ?? 0;
    metrics.missedCount += record.missed_count ?? 0;
    metrics.headCorrectCount += record.head_correct_count ?? 0;
    metrics.targetCorrectCount += record.target_correct_count ?? 0;
    metrics.sourceCorrectCount += record.source_correct_count ?? 0;
    metrics.sourceIncorrectCount += record.source_incorrect_count ?? 0;
    const attested = record.attested_count ?? 0;
    if (record.avg_inclusion_distance != null && attested > 0) {
      distanceSums.set(
        validatorIndex,
        (distanceSums.get(validatorIndex) ?? 0) + record.avg_inclusion_distance * attested
      );
      distanceCounts.set(validatorIndex, (distanceCounts.get(validatorIndex) ?? 0) + attested);
    }
    byValidator.set(validatorIndex, metrics);
  }

  for (const metrics of byValidator.values()) {
    const count = distanceCounts.get(metrics.validatorIndex);
    metrics.avgInclusionDistance = count ? (distanceSums.get(metrics.validatorIndex) ?? 0) / count : null;
    metrics.inclusionRate = safePercentage(metrics.attestedCount, metrics.totalDuties);
    metrics.headCorrectRate = safePercentage(metrics.headCorrectCount, metrics.attestedCount);
    metrics.targetCorrectRate = safePercentage(metrics.targetCorrectCount, metrics.attestedCount);
    metrics.sourceCorrectRate = safePercentage(
      metrics.sourceCorrectCount,
      metrics.sourceCorrectCount + metrics.sourceIncorrectCount
    );
  }

  return byValidator;
}

/**
 * Aggregate sync committee data by validator
 */
function aggregateSyncCommitteeByValidator(
  data: FctSyncCommitteeParticipationByValidatorDaily[]
): Map<number, ValidatorSyncCommitteeMetrics> {
  const byValidator = new Map<number, ValidatorSyncCommitteeMetrics>();

  for (const record of data) {
    const validatorIndex = record.validator_index ?? 0;
    const existing = byValidator.get(validatorIndex);

    if (existing) {
      existing.totalSlots += record.total_slots ?? 0;
      existing.participatedCount += record.participated_count ?? 0;
      existing.missedCount += record.missed_count ?? 0;
    } else {
      byValidator.set(validatorIndex, {
        validatorIndex,
        totalSlots: record.total_slots ?? 0,
        participatedCount: record.participated_count ?? 0,
        missedCount: record.missed_count ?? 0,
        participationRate: null,
      });
    }
  }

  // Calculate rates
  for (const metrics of byValidator.values()) {
    metrics.participationRate = safePercentage(metrics.participatedCount, metrics.totalSlots);
  }

  return byValidator;
}

/**
 * Aggregate balance data by validator (using latest record)
 */
function aggregateBalanceByValidator(data: FctValidatorBalanceDaily[]): Map<number, ValidatorBalanceMetrics> {
  const byValidator = new Map<number, ValidatorBalanceMetrics>();
  const latestDate = new Map<number, string>();

  // First pass: find min/max balances and track latest record
  const minBalances = new Map<number, number>();
  const maxBalances = new Map<number, number>();

  for (const record of data) {
    const validatorIndex = record.validator_index ?? 0;
    const dayDate = record.day_start_date ?? '';

    // Track min/max across all records
    if (record.min_balance !== null && record.min_balance !== undefined) {
      const currentMin = minBalances.get(validatorIndex);
      if (currentMin === undefined || record.min_balance < currentMin) {
        minBalances.set(validatorIndex, record.min_balance);
      }
    }
    if (record.max_balance !== null && record.max_balance !== undefined) {
      const currentMax = maxBalances.get(validatorIndex);
      if (currentMax === undefined || record.max_balance > currentMax) {
        maxBalances.set(validatorIndex, record.max_balance);
      }
    }

    // Track latest record for status/effective balance (string comparison works for YYYY-MM-DD)
    const currentLatest = latestDate.get(validatorIndex) ?? '';
    if (dayDate >= currentLatest) {
      latestDate.set(validatorIndex, dayDate);
      byValidator.set(validatorIndex, {
        validatorIndex,
        startBalance: gweiToEth(record.start_balance),
        endBalance: gweiToEth(record.end_balance),
        minBalance: null, // Will be set in second pass
        maxBalance: null, // Will be set in second pass
        effectiveBalance: gweiToEth(record.effective_balance),
        status: record.status ?? 'unknown',
        slashed: record.slashed ?? false,
      });
    }
  }

  // Second pass: set min/max from aggregated values
  for (const [validatorIndex, metrics] of byValidator) {
    metrics.minBalance = gweiToEth(minBalances.get(validatorIndex) ?? null);
    metrics.maxBalance = gweiToEth(maxBalances.get(validatorIndex) ?? null);
  }

  return byValidator;
}

/**
 * Aggregate block proposal data by validator
 */
function aggregateBlockProposalByValidator(
  data: FctBlockProposerByValidator[]
): Map<number, ValidatorBlockProposalMetrics> {
  const byValidator = new Map<number, ValidatorBlockProposalMetrics>();

  for (const record of data) {
    const validatorIndex = record.validator_index ?? 0;
    const status = record.status ?? '';
    const existing = byValidator.get(validatorIndex);

    if (existing) {
      existing.totalProposals += 1;
      if (status === 'canonical') existing.canonicalCount += 1;
      else if (status === 'missed') existing.missedCount += 1;
      else if (status === 'orphaned') existing.orphanedCount += 1;
      else if (status === MISSED_OR_ORPHANED) existing.missedOrOrphanedCount += 1;
    } else {
      byValidator.set(validatorIndex, {
        validatorIndex,
        totalProposals: 1,
        canonicalCount: status === 'canonical' ? 1 : 0,
        missedCount: status === 'missed' ? 1 : 0,
        orphanedCount: status === 'orphaned' ? 1 : 0,
        missedOrOrphanedCount: status === MISSED_OR_ORPHANED ? 1 : 0,
        proposalRate: null,
      });
    }
  }

  for (const metrics of byValidator.values()) {
    metrics.proposalRate = safePercentage(metrics.canonicalCount, metrics.totalProposals);
  }

  return byValidator;
}

/**
 * Transform raw block proposal records into BlockProposalDataPoint[]
 */
function transformBlockProposals(data: FctBlockProposerByValidator[]): BlockProposalDataPoint[] {
  return data.map(record => ({
    slot: record.slot ?? 0,
    slotTimestamp: record.slot_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    status: record.status as ProposalStatus,
  }));
}

/**
 * Calculate aggregate summary across all validators
 */
function calculateAggregateSummary(
  attestationMap: Map<number, ValidatorAttestationMetrics>,
  syncCommitteeMap: Map<number, ValidatorSyncCommitteeMetrics>,
  blockProposalMap: Map<number, ValidatorBlockProposalMetrics>,
  balanceMap: Map<number, ValidatorBalanceMetrics>
): AggregateSummary {
  const attestationMetrics = Array.from(attestationMap.values());
  const syncCommitteeMetrics = Array.from(syncCommitteeMap.values());
  const balanceMetrics = Array.from(balanceMap.values());

  // Attestation aggregates
  const attestationTotals = attestationMetrics.reduce(
    (acc, m) => ({
      totalDuties: acc.totalDuties + m.totalDuties,
      attestedCount: acc.attestedCount + m.attestedCount,
      missedCount: acc.missedCount + m.missedCount,
      headCorrectCount: acc.headCorrectCount + m.headCorrectCount,
      targetCorrectCount: acc.targetCorrectCount + m.targetCorrectCount,
      sourceCorrectCount: acc.sourceCorrectCount + m.sourceCorrectCount,
      sourceIncorrectCount: acc.sourceIncorrectCount + m.sourceIncorrectCount,
    }),
    {
      totalDuties: 0,
      attestedCount: 0,
      missedCount: 0,
      headCorrectCount: 0,
      targetCorrectCount: 0,
      sourceCorrectCount: 0,
      sourceIncorrectCount: 0,
    }
  );

  // Sync committee aggregates
  const syncCommitteeTotals = syncCommitteeMetrics.reduce(
    (acc, m) => ({
      totalSlots: acc.totalSlots + m.totalSlots,
      participatedCount: acc.participatedCount + m.participatedCount,
      missedCount: acc.missedCount + m.missedCount,
    }),
    { totalSlots: 0, participatedCount: 0, missedCount: 0 }
  );

  // Balance aggregates
  let minBalance: number | null = null;
  let maxBalance: number | null = null;
  let totalEndBalance = 0;
  let balanceCount = 0;

  for (const m of balanceMetrics) {
    if (m.minBalance !== null) {
      if (minBalance === null || m.minBalance < minBalance) {
        minBalance = m.minBalance;
      }
    }
    if (m.maxBalance !== null) {
      if (maxBalance === null || m.maxBalance > maxBalance) {
        maxBalance = m.maxBalance;
      }
    }
    if (m.endBalance !== null) {
      totalEndBalance += m.endBalance;
      balanceCount++;
    }
  }

  // Block proposal aggregates
  const blockProposalMetrics = Array.from(blockProposalMap.values());
  const blockProposalTotals = blockProposalMetrics.reduce(
    (acc, m) => ({
      totalProposals: acc.totalProposals + m.totalProposals,
      canonicalCount: acc.canonicalCount + m.canonicalCount,
      missedCount: acc.missedCount + m.missedCount,
      orphanedCount: acc.orphanedCount + m.orphanedCount,
      missedOrOrphanedCount: acc.missedOrOrphanedCount + m.missedOrOrphanedCount,
    }),
    { totalProposals: 0, canonicalCount: 0, missedCount: 0, orphanedCount: 0, missedOrOrphanedCount: 0 }
  );

  return {
    totalValidators: Math.max(attestationMap.size, balanceMap.size),
    attestation: {
      ...attestationTotals,
      inclusionRate: safePercentage(attestationTotals.attestedCount, attestationTotals.totalDuties),
      headCorrectRate: safePercentage(attestationTotals.headCorrectCount, attestationTotals.attestedCount),
      targetCorrectRate: safePercentage(attestationTotals.targetCorrectCount, attestationTotals.attestedCount),
      sourceCorrectRate: safePercentage(
        attestationTotals.sourceCorrectCount,
        attestationTotals.sourceCorrectCount + attestationTotals.sourceIncorrectCount
      ),
    },
    syncCommittee: {
      ...syncCommitteeTotals,
      participationRate: safePercentage(syncCommitteeTotals.participatedCount, syncCommitteeTotals.totalSlots),
      validatorsWithDuties: syncCommitteeMetrics.length,
    },
    blockProposal: {
      ...blockProposalTotals,
      proposalRate: safePercentage(blockProposalTotals.canonicalCount, blockProposalTotals.totalProposals),
      validatorsWithDuties: blockProposalMetrics.length,
    },
    balance: {
      minBalance,
      maxBalance,
      avgEndBalance: balanceCount > 0 ? totalEndBalance / balanceCount : null,
    },
  };
}

/**
 * Transform attestation data to daily data points
 */
function transformAttestationDaily(data: FctAttestationVoteCorrectnessByValidatorDaily[]): AttestationDailyDataPoint[] {
  return data.map(record => {
    const validatorIndex = record.validator_index ?? 0;
    const sourceCorrect = record.source_correct_count ?? 0;
    const sourceIncorrect = record.source_incorrect_count ?? 0;
    return {
      timestamp: dateStringToTimestamp(record.day_start_date ?? ''),
      validatorIndex,
      inclusionRate: safePercentage(record.attested_count ?? 0, record.total_duties ?? 0),
      headCorrectRate: safePercentage(record.head_correct_count ?? 0, record.attested_count ?? 0),
      targetCorrectRate: safePercentage(record.target_correct_count ?? 0, record.attested_count ?? 0),
      sourceCorrectRate: safePercentage(sourceCorrect, sourceCorrect + sourceIncorrect),
      avgInclusionDistance: record.avg_inclusion_distance ?? null,
    };
  });
}

/**
 * Transform sync committee data to daily data points
 */
function transformSyncCommitteeDaily(
  data: FctSyncCommitteeParticipationByValidatorDaily[]
): SyncCommitteeDailyDataPoint[] {
  return data.map(record => ({
    timestamp: dateStringToTimestamp(record.day_start_date ?? ''),
    validatorIndex: record.validator_index ?? 0,
    participationRate: safePercentage(record.participated_count ?? 0, record.total_slots ?? 0),
  }));
}

/**
 * Transform balance data to daily data points
 */
function transformBalanceDaily(data: FctValidatorBalanceDaily[]): BalanceDailyDataPoint[] {
  return data.map(record => ({
    timestamp: dateStringToTimestamp(record.day_start_date ?? ''),
    validatorIndex: record.validator_index ?? 0,
    balance: gweiToEth(record.end_balance),
    minBalance: gweiToEth(record.min_balance),
    maxBalance: gweiToEth(record.max_balance),
  }));
}

/**
 * Hook to fetch and aggregate validator performance data
 *
 * @param validatorIndices - Array of validator indices to fetch data for
 * @param startTime - First day of the range (Unix seconds, start of day UTC)
 * @param endTime - Last day of the range (Unix seconds, start of day UTC); the day is included
 */
export function useValidatorsData(
  validatorIndices: number[],
  startTime: number,
  endTime: number,
  {
    resolution = 'day',
    slotsFrom = startTime,
    slotsEnd = endTime + 86400,
    performanceFrom = startTime,
  }: {
    /**
     * Row granularity: one row per validator per day, or per week (Monday UTC). Weekly rows cover the whole weeks in
     * the range; the days before and after them are added up into partial weeks from the daily rows.
     */
    resolution?: 'day' | 'week';
    /** Start (Unix seconds) of the per-slot proposal read, no earlier than the proposer table's data */
    slotsFrom?: number;
    /** Exclusive end (Unix seconds) of the per-slot proposal read, which can run past the range's last day */
    slotsEnd?: number;
    /** Start (Unix seconds) of the proposals counted in the summary and per-day views, where attestation data starts */
    performanceFrom?: number;
  } = {}
): UseValidatorsDataReturn {
  const { currentNetwork } = useNetwork();

  const indicesString = validatorIndices.join(',');
  const enabled = validatorIndices.length > 0 && startTime > 0 && endTime > 0 && !!currentNetwork;

  const weekly = resolution === 'week';
  // End of the range's last day, where the rollups stop
  const rangeEnd = endTime + 86400;

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: [
      'validators',
      'inspect',
      currentNetwork?.name,
      indicesString,
      resolution,
      startTime,
      endTime,
      slotsFrom,
      slotsEnd,
    ],
    queryFn: async ({ signal }) => {
      const chunks = chunkArray(validatorIndices, VALIDATORS_PER_REQUEST).map(c => c.join(','));
      // Every request lists its days or weeks, so each one has a start and an end
      const periods = rollupPeriods(startTime, endTime, weekly);
      /** Every row for every chunk of validators */
      const rows = async <T>(fn: unknown, table: string, query: Record<string, unknown>): Promise<T[]> =>
        (
          await Promise.all(
            chunks.map(ids =>
              fetchAllPages<T>(
                fn as ListFn,
                { query: { validator_index_in_values: ids, ...query, page_size: API_MAX_PAGE_SIZE } },
                table,
                signal
              )
            )
          )
        ).flat();
      // Weekly rows keep the daily shape, keyed by their week's Monday, so every consumer reads both
      const rollup = async <T extends { validator_index?: number; day_start_date?: string }>(
        daily: unknown,
        weeklyFn: unknown,
        table: string,
        merge: (days: T[]) => Partial<T>
      ): Promise<T[]> => {
        const [weekRows, dayRows] = await Promise.all([
          Promise.all(
            chunkArray(periods.weeks, WEEKS_PER_REQUEST).map(weeks =>
              rows<T & { week_start_date?: string }>(weeklyFn, `${table}_weekly`, {
                week_start_date_in_values: weeks.join(','),
                order_by: 'week_start_date, validator_index',
              })
            )
          ).then(pages => pages.flat()),
          periods.days.length > 0
            ? rows<T>(daily, `${table}_daily`, {
                day_start_date_in_values: periods.days.join(','),
                order_by: 'day_start_date, validator_index',
              })
            : [],
        ]);
        return [
          ...weekRows.map(({ week_start_date, ...rest }) => ({ ...rest, day_start_date: week_start_date }) as T),
          ...(weekly ? intoWeeks(dayRows, merge) : dayRows),
        ];
      };

      const [attestation, syncCommittee, balance, blockProposal] = await Promise.all([
        rollup<FctAttestationVoteCorrectnessByValidatorDaily>(
          fctAttestationVoteCorrectnessByValidatorDailyServiceList,
          fctAttestationVoteCorrectnessByValidatorWeeklyServiceList,
          'fct_attestation_vote_correctness_by_validator',
          mergeAttestationDays
        ),
        rollup<FctSyncCommitteeParticipationByValidatorDaily>(
          fctSyncCommitteeParticipationByValidatorDailyServiceList,
          fctSyncCommitteeParticipationByValidatorWeeklyServiceList,
          'fct_sync_committee_participation_by_validator',
          mergeSyncDays
        ),
        rollup<FctValidatorBalanceDaily>(
          fctValidatorBalanceDailyServiceList,
          fctValidatorBalanceWeeklyServiceList,
          'fct_validator_balance',
          mergeBalanceDays
        ),
        rows<FctBlockProposerByValidator>(fctBlockProposerByValidatorServiceList, 'fct_block_proposer_by_validator', {
          slot_start_date_time_gte: slotsFrom,
          slot_start_date_time_lt: slotsEnd,
          order_by: 'slot_start_date_time',
        }),
      ]);
      return {
        attestation,
        syncCommittee,
        balance,
        blockProposal,
      };
    },
    enabled,
    // Another range of the same validators stays on screen while this one loads
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === indicesString ? previous : undefined),
  });

  // Statuses as far as they are known: before the head table starts, orphaned blocks were never seen
  const orphansKnownFrom = useTableBounds('fct_block_proposer_head').data?.min;
  const blockProposalRows = useMemo(
    () =>
      (data?.blockProposal ?? []).map(p => ({
        ...p,
        status: proposalStatus(p.status, p.slot_start_date_time ?? 0, orphansKnownFrom),
      })),
    [data, orphansKnownFrom]
  );

  const processedData = useMemo(() => {
    if (!data) {
      return {
        validators: [],
        summary: null,
        attestationDaily: [],
        syncCommitteeDaily: [],
        balanceDaily: [],
        blockProposals: [],
      };
    }
    const { attestation: attestationData, syncCommittee: syncCommitteeData, balance: balanceData } = data;
    // Summaries and the heatmap count proposals over the rollups' days, which can end before the per-slot read
    const blockProposalData = blockProposalRows.filter(
      p => (p.slot_start_date_time ?? 0) >= performanceFrom && (p.slot_start_date_time ?? 0) < rangeEnd
    );

    const attestationByValidator = aggregateAttestationByValidator(attestationData);
    const syncCommitteeByValidator = aggregateSyncCommitteeByValidator(syncCommitteeData);
    const blockProposalByValidator = aggregateBlockProposalByValidator(blockProposalData);
    const balanceByValidator = aggregateBalanceByValidator(balanceData);

    // Combine all metrics by validator
    const allValidatorIndices = new Set([
      ...attestationByValidator.keys(),
      ...syncCommitteeByValidator.keys(),
      ...blockProposalByValidator.keys(),
      ...balanceByValidator.keys(),
    ]);

    const validators: ValidatorMetrics[] = Array.from(allValidatorIndices)
      .map(validatorIndex => {
        const attestation = attestationByValidator.get(validatorIndex) ?? {
          validatorIndex,
          totalDuties: 0,
          attestedCount: 0,
          missedCount: 0,
          headCorrectCount: 0,
          targetCorrectCount: 0,
          sourceCorrectCount: 0,
          sourceIncorrectCount: 0,
          avgInclusionDistance: null,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
        };

        const syncCommittee = syncCommitteeByValidator.get(validatorIndex) ?? null;
        const blockProposal = blockProposalByValidator.get(validatorIndex) ?? null;

        const balance = balanceByValidator.get(validatorIndex) ?? {
          validatorIndex,
          startBalance: null,
          endBalance: null,
          minBalance: null,
          maxBalance: null,
          effectiveBalance: null,
          status: 'unknown',
          slashed: false,
        };

        return {
          validatorIndex,
          attestation,
          syncCommittee,
          blockProposal,
          balance,
        };
      })
      .sort((a, b) => a.validatorIndex - b.validatorIndex);

    const summary = calculateAggregateSummary(
      attestationByValidator,
      syncCommitteeByValidator,
      blockProposalByValidator,
      balanceByValidator
    );

    return {
      validators,
      summary,
      attestationDaily: transformAttestationDaily(attestationData),
      syncCommitteeDaily: transformSyncCommitteeDaily(syncCommitteeData),
      balanceDaily: transformBalanceDaily(balanceData),
      blockProposals: transformBlockProposals(blockProposalData),
    };
  }, [data, blockProposalRows, performanceFrom, rangeEnd]);

  const raw = {
    attestation: data?.attestation ?? [],
    syncCommittee: data?.syncCommittee ?? [],
    balance: data?.balance ?? [],
    blockProposal: blockProposalRows,
  };
  return {
    ...processedData,
    raw,
    isLoading,
    isPlaceholderData,
    error,
    hasData: Object.values(raw).some(rows => rows.length > 0),
  };
}
