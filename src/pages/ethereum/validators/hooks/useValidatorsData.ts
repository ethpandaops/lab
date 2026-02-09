import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctAttestationVoteCorrectnessByValidatorDailyServiceListOptions,
  fctBlockProposerByValidatorServiceListOptions,
  fctSyncCommitteeParticipationByValidatorDailyServiceListOptions,
  fctValidatorBalanceDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
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

/** Split an array into chunks of a given size */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** Count the number of days in a UTC timestamp range (inclusive) */
function countDaysInRange(startTs: number, endTs: number): number {
  const startDate = new Date(startTs * 1000);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(endTs * 1000);
  endDate.setUTCHours(0, 0, 0, 0);
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
}

/**
 * Convert Gwei to ETH
 */
function gweiToEth(gwei: number | null | undefined): number | null {
  if (gwei === null || gwei === undefined) return null;
  return gwei / 1_000_000_000;
}

/**
 * Calculate percentage safely
 */
function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
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
 * Aggregate attestation data by validator
 */
function aggregateAttestationByValidator(
  data: FctAttestationVoteCorrectnessByValidatorDaily[]
): Map<number, ValidatorAttestationMetrics> {
  const byValidator = new Map<number, ValidatorAttestationMetrics>();

  for (const record of data) {
    const validatorIndex = record.validator_index ?? 0;
    const existing = byValidator.get(validatorIndex);

    if (existing) {
      existing.totalDuties += record.total_duties ?? 0;
      existing.attestedCount += record.attested_count ?? 0;
      existing.missedCount += record.missed_count ?? 0;
      existing.headCorrectCount += record.head_correct_count ?? 0;
      existing.targetCorrectCount += record.target_correct_count ?? 0;
      existing.sourceCorrectCount += record.source_correct_count ?? 0;
      // For average inclusion distance, we need to track count and sum
      if (record.avg_inclusion_distance !== null && record.avg_inclusion_distance !== undefined) {
        if (existing.avgInclusionDistance === null) {
          existing.avgInclusionDistance = record.avg_inclusion_distance;
        } else {
          // Simple averaging - could be weighted by attested count for more accuracy
          existing.avgInclusionDistance = (existing.avgInclusionDistance + record.avg_inclusion_distance) / 2;
        }
      }
    } else {
      byValidator.set(validatorIndex, {
        validatorIndex,
        totalDuties: record.total_duties ?? 0,
        attestedCount: record.attested_count ?? 0,
        missedCount: record.missed_count ?? 0,
        headCorrectCount: record.head_correct_count ?? 0,
        targetCorrectCount: record.target_correct_count ?? 0,
        sourceCorrectCount: record.source_correct_count ?? 0,
        avgInclusionDistance: record.avg_inclusion_distance ?? null,
        inclusionRate: 0,
        headCorrectRate: 0,
        targetCorrectRate: 0,
        sourceCorrectRate: 0,
      });
    }
  }

  // Calculate rates
  for (const metrics of byValidator.values()) {
    metrics.inclusionRate = safePercentage(metrics.attestedCount, metrics.totalDuties);
    metrics.headCorrectRate = safePercentage(metrics.headCorrectCount, metrics.attestedCount);
    metrics.targetCorrectRate = safePercentage(metrics.targetCorrectCount, metrics.attestedCount);
    metrics.sourceCorrectRate = safePercentage(metrics.sourceCorrectCount, metrics.attestedCount);
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
        participationRate: 0,
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
        proposalRate: 0,
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
    }),
    {
      totalDuties: 0,
      attestedCount: 0,
      missedCount: 0,
      headCorrectCount: 0,
      targetCorrectCount: 0,
      sourceCorrectCount: 0,
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
      sourceCorrectRate: safePercentage(attestationTotals.sourceCorrectCount, attestationTotals.attestedCount),
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
  return data.map(record => ({
    timestamp: dateStringToTimestamp(record.day_start_date ?? ''),
    validatorIndex: record.validator_index ?? 0,
    inclusionRate: safePercentage(record.attested_count ?? 0, record.total_duties ?? 0),
    headCorrectRate: safePercentage(record.head_correct_count ?? 0, record.attested_count ?? 0),
    targetCorrectRate: safePercentage(record.target_correct_count ?? 0, record.attested_count ?? 0),
    sourceCorrectRate: safePercentage(record.source_correct_count ?? 0, record.attested_count ?? 0),
    avgInclusionDistance: record.avg_inclusion_distance ?? null,
  }));
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
  endTime: number
): UseValidatorsDataReturn {
  const { currentNetwork } = useNetwork();

  const indicesString = validatorIndices.join(',');
  const enabled = validatorIndices.length > 0 && startTime > 0 && endTime > 0 && !!currentNetwork;

  const dateRangeString = useMemo(
    () => (enabled ? generateDateRange(startTime, endTime) : ''),
    [enabled, startTime, endTime]
  );

  // Split validators into chunks so each chunk x days < API_MAX_PAGE_SIZE
  const dayCount = countDaysInRange(startTime, endTime);
  const maxValidatorsPerChunk = Math.max(1, Math.floor(API_MAX_PAGE_SIZE / dayCount));
  const validatorChunks = useMemo(
    () => (enabled ? chunkArray(validatorIndices, maxValidatorsPerChunk) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, indicesString, maxValidatorsPerChunk]
  );
  const chunkCount = validatorChunks.length;

  // Build dynamic query list: for each chunk, generate 4 endpoint queries
  // Layout: [attestation_chunk0..N, sync_chunk0..N, balance_chunk0..N, blockProposer_chunk0..N]
  const results = useQueries({
    queries: validatorChunks.flatMap(chunk => {
      const chunkIndicesString = chunk.join(',');
      return [
        {
          ...fctAttestationVoteCorrectnessByValidatorDailyServiceListOptions({
            query: {
              validator_index_in_values: chunkIndicesString,
              day_start_date_in_values: dateRangeString,
              page_size: API_MAX_PAGE_SIZE,
              order_by: 'day_start_date',
            },
          }),
          enabled,
        },
        {
          ...fctSyncCommitteeParticipationByValidatorDailyServiceListOptions({
            query: {
              validator_index_in_values: chunkIndicesString,
              day_start_date_in_values: dateRangeString,
              page_size: API_MAX_PAGE_SIZE,
              order_by: 'day_start_date',
            },
          }),
          enabled,
        },
        {
          ...fctValidatorBalanceDailyServiceListOptions({
            query: {
              validator_index_in_values: chunkIndicesString,
              day_start_date_in_values: dateRangeString,
              page_size: API_MAX_PAGE_SIZE,
              order_by: 'day_start_date',
            },
          }),
          enabled,
        },
        {
          ...fctBlockProposerByValidatorServiceListOptions({
            query: {
              validator_index_in_values: chunkIndicesString,
              slot_start_date_time_gte: startTime,
              slot_start_date_time_lte: endTime + 86400,
              page_size: API_MAX_PAGE_SIZE,
              order_by: 'slot_start_date_time',
            },
          }),
          enabled,
        },
      ];
    }),
  });

  const isLoading = results.some(r => r.isLoading);
  const error = results.find(r => r.error)?.error ?? null;

  // Type assertions for response data extraction
  type AttestationResponse = {
    fct_attestation_vote_correctness_by_validator_daily?: FctAttestationVoteCorrectnessByValidatorDaily[];
  };
  type SyncCommitteeResponse = {
    fct_sync_committee_participation_by_validator_daily?: FctSyncCommitteeParticipationByValidatorDaily[];
  };
  type BalanceResponse = { fct_validator_balance_daily?: FctValidatorBalanceDaily[] };
  type BlockProposalResponse = { fct_block_proposer_by_validator?: FctBlockProposerByValidator[] };

  // Merge chunked results: each chunk produced 4 queries (attestation, sync, balance, blockProposer)
  // Use dataUpdatedAt as a stable dependency — changes only when data actually updates
  const attestationUpdatedAt = results
    .filter((_, i) => i % 4 === 0)
    .map(r => r.dataUpdatedAt)
    .join(',');
  const syncUpdatedAt = results
    .filter((_, i) => i % 4 === 1)
    .map(r => r.dataUpdatedAt)
    .join(',');
  const balanceUpdatedAt = results
    .filter((_, i) => i % 4 === 2)
    .map(r => r.dataUpdatedAt)
    .join(',');
  const blockProposalUpdatedAt = results
    .filter((_, i) => i % 4 === 3)
    .map(r => r.dataUpdatedAt)
    .join(',');

  const attestationData = useMemo(() => {
    if (chunkCount === 0) return [];
    return results
      .filter((_, i) => i % 4 === 0)
      .flatMap(
        r => (r.data as AttestationResponse | undefined)?.fct_attestation_vote_correctness_by_validator_daily ?? []
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkCount, attestationUpdatedAt]);

  const syncCommitteeData = useMemo(() => {
    if (chunkCount === 0) return [];
    return results
      .filter((_, i) => i % 4 === 1)
      .flatMap(
        r => (r.data as SyncCommitteeResponse | undefined)?.fct_sync_committee_participation_by_validator_daily ?? []
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkCount, syncUpdatedAt]);

  const balanceData = useMemo(() => {
    if (chunkCount === 0) return [];
    return results
      .filter((_, i) => i % 4 === 2)
      .flatMap(r => (r.data as BalanceResponse | undefined)?.fct_validator_balance_daily ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkCount, balanceUpdatedAt]);

  const blockProposalData = useMemo(() => {
    if (chunkCount === 0) return [];
    return results
      .filter((_, i) => i % 4 === 3)
      .flatMap(r => (r.data as BlockProposalResponse | undefined)?.fct_block_proposer_by_validator ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkCount, blockProposalUpdatedAt]);

  const processedData = useMemo(() => {
    if (!enabled || isLoading) {
      return {
        validators: [],
        summary: null,
        attestationDaily: [],
        syncCommitteeDaily: [],
        balanceDaily: [],
        blockProposals: [],
      };
    }

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
          avgInclusionDistance: null,
          inclusionRate: 0,
          headCorrectRate: 0,
          targetCorrectRate: 0,
          sourceCorrectRate: 0,
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
  }, [enabled, isLoading, attestationData, syncCommitteeData, balanceData, blockProposalData]);

  return {
    ...processedData,
    raw: {
      attestation: attestationData,
      syncCommittee: syncCommitteeData,
      balance: balanceData,
      blockProposal: blockProposalData,
    },
    isLoading,
    error: error as Error | null,
    hasData:
      attestationData.length > 0 ||
      syncCommitteeData.length > 0 ||
      balanceData.length > 0 ||
      blockProposalData.length > 0,
  };
}
