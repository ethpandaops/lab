import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctAttestationVoteCorrectnessByValidatorHourlyServiceListOptions,
  fctSyncCommitteeParticipationByValidatorHourlyServiceListOptions,
  fctValidatorBalanceHourlyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import type {
  FctAttestationVoteCorrectnessByValidatorHourly,
  FctSyncCommitteeParticipationByValidatorHourly,
  FctValidatorBalanceHourly,
} from '@/api/types.gen';

/** Base shape for hourly data points */
interface HourlyDataPoint {
  timestamp: number;
  validatorIndex: number;
}

/** Attestation hourly data point */
export interface AttestationHourlyDataPoint extends HourlyDataPoint {
  inclusionRate: number;
  headCorrectRate: number;
  targetCorrectRate: number;
  sourceCorrectRate: number;
  avgInclusionDistance: number | null;
}

/** Sync committee hourly data point */
export interface SyncCommitteeHourlyDataPoint extends HourlyDataPoint {
  participationRate: number;
}

/** Balance hourly data point */
export interface BalanceHourlyDataPoint extends HourlyDataPoint {
  balance: number | null;
  minBalance: number | null;
  maxBalance: number | null;
}

/** Return type for useHourlyData */
interface UseHourlyDataReturn {
  attestationHourly: AttestationHourlyDataPoint[];
  syncCommitteeHourly: SyncCommitteeHourlyDataPoint[];
  balanceHourly: BalanceHourlyDataPoint[];
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
}

/**
 * Calculate percentage safely
 */
function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

/**
 * Convert Gwei to ETH
 */
function gweiToEth(gwei: number | null | undefined): number | null {
  if (gwei === null || gwei === undefined) return null;
  return gwei / 1_000_000_000;
}

/**
 * Transform raw attestation hourly records to data points
 */
function transformAttestationHourly(
  data: FctAttestationVoteCorrectnessByValidatorHourly[]
): AttestationHourlyDataPoint[] {
  return data.map(record => ({
    timestamp: record.hour_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    inclusionRate: safePercentage(record.attested_count ?? 0, record.total_duties ?? 0),
    headCorrectRate: safePercentage(record.head_correct_count ?? 0, record.attested_count ?? 0),
    targetCorrectRate: safePercentage(record.target_correct_count ?? 0, record.attested_count ?? 0),
    sourceCorrectRate: safePercentage(record.source_correct_count ?? 0, record.attested_count ?? 0),
    avgInclusionDistance: record.avg_inclusion_distance ?? null,
  }));
}

/**
 * Transform raw sync committee hourly records to data points
 */
function transformSyncCommitteeHourly(
  data: FctSyncCommitteeParticipationByValidatorHourly[]
): SyncCommitteeHourlyDataPoint[] {
  return data.map(record => ({
    timestamp: record.hour_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    participationRate: safePercentage(record.participated_count ?? 0, record.total_slots ?? 0),
  }));
}

/**
 * Transform raw balance hourly records to data points
 */
function transformBalanceHourly(data: FctValidatorBalanceHourly[]): BalanceHourlyDataPoint[] {
  return data.map(record => ({
    timestamp: record.hour_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    balance: gweiToEth(record.end_balance),
    minBalance: gweiToEth(record.min_balance),
    maxBalance: gweiToEth(record.max_balance),
  }));
}

/**
 * Lazy-loading hook that fetches hourly data for a single day + set of validators.
 *
 * When `dayTimestamp` is `null`, all queries are disabled.
 * Fetches attestation, sync committee, and balance data in parallel.
 *
 * @param validatorIndices - Array of validator indices to fetch data for
 * @param dayTimestamp - Start-of-day Unix timestamp (seconds), or null to disable
 */
export function useHourlyData(validatorIndices: number[], dayTimestamp: number | null): UseHourlyDataReturn {
  const { currentNetwork } = useNetwork();

  const indicesString = validatorIndices.join(',');
  const enabled = dayTimestamp !== null && validatorIndices.length > 0 && !!currentNetwork;
  const dayEnd = dayTimestamp !== null ? dayTimestamp + 86400 : 0;

  const results = useQueries({
    queries: [
      {
        ...fctAttestationVoteCorrectnessByValidatorHourlyServiceListOptions({
          query: {
            validator_index_in_values: indicesString,
            hour_start_date_time_gte: dayTimestamp ?? 0,
            hour_start_date_time_lt: dayEnd,
            page_size: 10000,
            order_by: 'hour_start_date_time',
          },
        }),
        enabled,
      },
      {
        ...fctSyncCommitteeParticipationByValidatorHourlyServiceListOptions({
          query: {
            validator_index_in_values: indicesString,
            hour_start_date_time_gte: dayTimestamp ?? 0,
            hour_start_date_time_lt: dayEnd,
            page_size: 10000,
            order_by: 'hour_start_date_time',
          },
        }),
        enabled,
      },
      {
        ...fctValidatorBalanceHourlyServiceListOptions({
          query: {
            validator_index_in_values: indicesString,
            hour_start_date_time_gte: dayTimestamp ?? 0,
            hour_start_date_time_lt: dayEnd,
            page_size: 10000,
            order_by: 'hour_start_date_time',
          },
        }),
        enabled,
      },
    ],
  });

  const [attestationQuery, syncCommitteeQuery, balanceQuery] = results;

  const isLoading = attestationQuery.isLoading || syncCommitteeQuery.isLoading || balanceQuery.isLoading;
  const error = attestationQuery.error || syncCommitteeQuery.error || balanceQuery.error;

  type AttestationResponse = {
    fct_attestation_vote_correctness_by_validator_hourly?: FctAttestationVoteCorrectnessByValidatorHourly[];
  };
  type SyncCommitteeResponse = {
    fct_sync_committee_participation_by_validator_hourly?: FctSyncCommitteeParticipationByValidatorHourly[];
  };
  type BalanceResponse = { fct_validator_balance_hourly?: FctValidatorBalanceHourly[] };

  const attestationData = useMemo(
    () =>
      (attestationQuery.data as AttestationResponse | undefined)
        ?.fct_attestation_vote_correctness_by_validator_hourly ?? [],
    [attestationQuery.data]
  );
  const syncCommitteeData = useMemo(
    () =>
      (syncCommitteeQuery.data as SyncCommitteeResponse | undefined)
        ?.fct_sync_committee_participation_by_validator_hourly ?? [],
    [syncCommitteeQuery.data]
  );
  const balanceData = useMemo(
    () => (balanceQuery.data as BalanceResponse | undefined)?.fct_validator_balance_hourly ?? [],
    [balanceQuery.data]
  );

  const processedData = useMemo(() => {
    if (!enabled || isLoading) {
      return {
        attestationHourly: [] as AttestationHourlyDataPoint[],
        syncCommitteeHourly: [] as SyncCommitteeHourlyDataPoint[],
        balanceHourly: [] as BalanceHourlyDataPoint[],
      };
    }

    return {
      attestationHourly: transformAttestationHourly(attestationData),
      syncCommitteeHourly: transformSyncCommitteeHourly(syncCommitteeData),
      balanceHourly: transformBalanceHourly(balanceData),
    };
  }, [enabled, isLoading, attestationData, syncCommitteeData, balanceData]);

  return {
    ...processedData,
    isLoading,
    error: error as Error | null,
    hasData: attestationData.length > 0 || syncCommitteeData.length > 0 || balanceData.length > 0,
  };
}
