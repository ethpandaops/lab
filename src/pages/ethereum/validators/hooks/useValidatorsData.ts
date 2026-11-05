import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fctAttestationVoteCorrectnessByValidatorDailyServiceList,
  fctAttestationVoteCorrectnessByValidatorServiceList,
  fctAttestationVoteCorrectnessByValidatorWeeklyServiceList,
  fctBlockProposerByValidatorServiceList,
  fctSyncCommitteeParticipationByValidatorDailyServiceList,
  fctSyncCommitteeParticipationByValidatorWeeklyServiceList,
  fctValidatorBalanceDailyServiceList,
  fctValidatorBalanceWeeklyServiceList,
} from '@/api/sdk.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { useNetwork } from '@/hooks/useNetwork';
import { weekStartOf } from '../utils/week';
import { currentUtcDate, currentUtcWeek } from '@/utils/time';
import type {
  FctAttestationVoteCorrectnessByValidator,
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

/**
 * Generate all YYYY-MM-DD date strings in a range, joined by commas
 */
function generateDateRange(startTs: number, endTs: number): string {
  const dates: string[] = [];
  const startDate = new Date(startTs * 1000);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(endTs * 1000);
  endDate.setUTCHours(23, 59, 59, 999);

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates.join(',');
}

/**
 * Wrong source votes per validator and per validator and day (or week), keyed `validator` and `validator:day`.
 * The rollups count only correct source votes; a source vote is unknown when the attestation was never seen on
 * gossip, so the source rate divides by correct plus wrong votes rather than by attestations.
 */
type SourceMisses = Map<string, number>;

/** Key of a validator's wrong source votes on one day (or week), or over the range */
function sourceMissKey(validatorIndex: number, day?: string): string {
  return day === undefined ? String(validatorIndex) : `${validatorIndex}:${day}`;
}

/** Count wrong source votes per validator, and per validator and day or week */
function countSourceMisses(rows: FctAttestationVoteCorrectnessByValidator[], weekly: boolean): SourceMisses {
  const misses: SourceMisses = new Map();
  const add = (key: string): void => {
    misses.set(key, (misses.get(key) ?? 0) + 1);
  };
  for (const row of rows) {
    const validatorIndex = row.validator_index ?? 0;
    const day = new Date((row.slot_start_date_time ?? 0) * 1000).toISOString().slice(0, 10);
    add(sourceMissKey(validatorIndex));
    add(sourceMissKey(validatorIndex, weekly ? weekStartOf(day) : day));
  }
  return misses;
}

/**
 * Aggregate attestation data by validator
 */
function aggregateAttestationByValidator(
  data: FctAttestationVoteCorrectnessByValidatorDaily[],
  sourceMisses: SourceMisses
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
    metrics.sourceIncorrectCount = sourceMisses.get(sourceMissKey(metrics.validatorIndex)) ?? 0;
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
    } else {
      byValidator.set(validatorIndex, {
        validatorIndex,
        totalProposals: 1,
        canonicalCount: status === 'canonical' ? 1 : 0,
        missedCount: status === 'missed' ? 1 : 0,
        orphanedCount: status === 'orphaned' ? 1 : 0,
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
    status: (record.status as 'canonical' | 'orphaned' | 'missed') ?? 'missed',
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
    }),
    { totalProposals: 0, canonicalCount: 0, missedCount: 0, orphanedCount: 0 }
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
function transformAttestationDaily(
  data: FctAttestationVoteCorrectnessByValidatorDaily[],
  sourceMisses: SourceMisses
): AttestationDailyDataPoint[] {
  return data.map(record => {
    const validatorIndex = record.validator_index ?? 0;
    const sourceCorrect = record.source_correct_count ?? 0;
    const sourceIncorrect = sourceMisses.get(sourceMissKey(validatorIndex, record.day_start_date ?? '')) ?? 0;
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
 * @param startTime - Start timestamp (Unix seconds)
 * @param endTime - End timestamp (Unix seconds)
 */
export function useValidatorsData(
  validatorIndices: number[],
  startTime: number,
  endTime: number,
  {
    resolution = 'day',
    allHistory = false,
  }: {
    /** Row granularity: one row per validator per day, or per week (Monday UTC) */
    resolution?: 'day' | 'week';
    /** The range starts at the earliest data, so days need no explicit list */
    allHistory?: boolean;
  } = {}
): UseValidatorsDataReturn {
  const { currentNetwork } = useNetwork();

  const indicesString = validatorIndices.join(',');
  const enabled = validatorIndices.length > 0 && startTime > 0 && endTime > 0 && !!currentNetwork;

  const weekly = resolution === 'week';
  const dateRangeString = useMemo(() => {
    if (!enabled || allHistory) return '';
    const days = generateDateRange(startTime, endTime);
    return weekly ? [...new Set(days.split(',').map(weekStartOf))].join(',') : days;
  }, [enabled, allHistory, weekly, startTime, endTime]);
  // Listing every day of a multi-year range would not fit in a URL
  const dayFilter = allHistory
    ? { day_start_date_ne: currentUtcDate() }
    : { day_start_date_in_values: dateRangeString };
  const weekFilter = allHistory
    ? { week_start_date_ne: currentUtcWeek() }
    : { week_start_date_in_values: dateRangeString };
  const periodFilter = weekly ? weekFilter : dayFilter;
  const periodColumn = weekly ? 'week_start_date' : 'day_start_date';

  // Wrong source votes over the same days or weeks as the rollups, from the per-slot table
  const firstDay = new Date(startTime * 1000).toISOString().slice(0, 10);
  const lastDay = new Date(endTime * 1000).toISOString().slice(0, 10);
  const missesFrom = allHistory ? 0 : dateStringToTimestamp(weekly ? weekStartOf(firstDay) : firstDay);
  const missesTo = dateStringToTimestamp(weekly ? weekStartOf(lastDay) : lastDay) + (weekly ? 7 : 1) * 86400;

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: [
      'validators',
      'inspect',
      currentNetwork?.name,
      indicesString,
      resolution,
      periodFilter,
      startTime,
      endTime,
      missesFrom,
      missesTo,
    ],
    queryFn: async ({ signal }) => {
      const chunks = chunkArray(validatorIndices, VALIDATORS_PER_REQUEST).map(c => c.join(','));
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
      const rollup = async <T>(daily: unknown, weeklyFn: unknown, table: string): Promise<T[]> =>
        (
          await rows<T & { week_start_date?: string }>(
            weekly ? weeklyFn : daily,
            `${table}_${weekly ? 'weekly' : 'daily'}`,
            { ...periodFilter, order_by: `${periodColumn}, validator_index` }
          )
        ).map(({ week_start_date, ...rest }) =>
          week_start_date === undefined ? (rest as T) : ({ ...rest, day_start_date: week_start_date } as T)
        );

      const [attestation, syncCommittee, balance, blockProposal, sourceMissRows] = await Promise.all([
        rollup<FctAttestationVoteCorrectnessByValidatorDaily>(
          fctAttestationVoteCorrectnessByValidatorDailyServiceList,
          fctAttestationVoteCorrectnessByValidatorWeeklyServiceList,
          'fct_attestation_vote_correctness_by_validator'
        ),
        rollup<FctSyncCommitteeParticipationByValidatorDaily>(
          fctSyncCommitteeParticipationByValidatorDailyServiceList,
          fctSyncCommitteeParticipationByValidatorWeeklyServiceList,
          'fct_sync_committee_participation_by_validator'
        ),
        rollup<FctValidatorBalanceDaily>(
          fctValidatorBalanceDailyServiceList,
          fctValidatorBalanceWeeklyServiceList,
          'fct_validator_balance'
        ),
        rows<FctBlockProposerByValidator>(fctBlockProposerByValidatorServiceList, 'fct_block_proposer_by_validator', {
          slot_start_date_time_gte: startTime,
          slot_start_date_time_lt: endTime + 86400,
          order_by: 'slot_start_date_time',
        }),
        rows<FctAttestationVoteCorrectnessByValidator>(
          fctAttestationVoteCorrectnessByValidatorServiceList,
          'fct_attestation_vote_correctness_by_validator',
          { slot_start_date_time_gte: missesFrom, slot_start_date_time_lt: missesTo, source_correct_eq: false }
        ),
      ]);
      return {
        attestation,
        syncCommittee,
        balance,
        blockProposal,
        sourceMisses: countSourceMisses(sourceMissRows, weekly),
      };
    },
    enabled,
    // Another range of the same validators stays on screen while this one loads
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === indicesString ? previous : undefined),
  });

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
    const {
      attestation: attestationData,
      syncCommittee: syncCommitteeData,
      balance: balanceData,
      blockProposal: blockProposalData,
      sourceMisses,
    } = data;

    const attestationByValidator = aggregateAttestationByValidator(attestationData, sourceMisses);
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
      attestationDaily: transformAttestationDaily(attestationData, sourceMisses),
      syncCommitteeDaily: transformSyncCommitteeDaily(syncCommitteeData),
      balanceDaily: transformBalanceDaily(balanceData),
      blockProposals: transformBlockProposals(blockProposalData),
    };
  }, [data]);

  const raw = {
    attestation: data?.attestation ?? [],
    syncCommittee: data?.syncCommittee ?? [],
    balance: data?.balance ?? [],
    blockProposal: data?.blockProposal ?? [],
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
