import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctAttestationVoteCorrectnessByValidatorServiceList,
  fctAttestationVoteCorrectnessByValidatorHourlyServiceList,
  fctSyncCommitteeParticipationByValidatorHourlyServiceList,
  fctValidatorBalanceHourlyServiceList,
} from '@/api/sdk.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { useNetwork } from '@/hooks/useNetwork';
import type {
  FctAttestationVoteCorrectnessByValidator,
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
interface AttestationHourlyDataPoint extends HourlyDataPoint {
  inclusionRate: number | null;
  headCorrectRate: number | null;
  targetCorrectRate: number | null;
  sourceCorrectRate: number | null;
  avgInclusionDistance: number | null;
}

/** Sync committee hourly data point */
interface SyncCommitteeHourlyDataPoint extends HourlyDataPoint {
  participationRate: number | null;
}

/** Balance hourly data point */
interface BalanceHourlyDataPoint extends HourlyDataPoint {
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

/** Percentage, or null when there is nothing to divide by (no duties, no attestations) */
function safePercentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
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
 * Transform raw attestation hourly records to data points. The source rate divides by correct plus wrong source
 * votes: an attestation never seen on gossip has no known source vote.
 */
function transformAttestationHourly(
  data: FctAttestationVoteCorrectnessByValidatorHourly[],
  sourceMisses: FctAttestationVoteCorrectnessByValidator[]
): AttestationHourlyDataPoint[] {
  const missesByHour = new Map<string, number>();
  for (const row of sourceMisses) {
    const key = `${row.validator_index}:${Math.floor((row.slot_start_date_time ?? 0) / 3600) * 3600}`;
    missesByHour.set(key, (missesByHour.get(key) ?? 0) + 1);
  }
  return data.map(record => {
    const sourceCorrect = record.source_correct_count ?? 0;
    const sourceIncorrect = missesByHour.get(`${record.validator_index}:${record.hour_start_date_time}`) ?? 0;
    return {
      timestamp: record.hour_start_date_time ?? 0,
      validatorIndex: record.validator_index ?? 0,
      inclusionRate: safePercentage(record.attested_count ?? 0, record.total_duties ?? 0),
      headCorrectRate: safePercentage(record.head_correct_count ?? 0, record.attested_count ?? 0),
      targetCorrectRate: safePercentage(record.target_correct_count ?? 0, record.attested_count ?? 0),
      sourceCorrectRate: safePercentage(sourceCorrect, sourceCorrect + sourceIncorrect),
      avgInclusionDistance: record.avg_inclusion_distance ?? null,
    };
  });
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
        queryKey: [
          'validators',
          'fct_attestation_vote_correctness_by_validator_hourly',
          currentNetwork?.name,
          indicesString,
          dayTimestamp,
        ],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctAttestationVoteCorrectnessByValidatorHourly>(
            fctAttestationVoteCorrectnessByValidatorHourlyServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                hour_start_date_time_gte: dayTimestamp ?? 0,
                hour_start_date_time_lt: dayEnd,
                page_size: 10000,
                order_by: 'hour_start_date_time',
              },
            },
            'fct_attestation_vote_correctness_by_validator_hourly',
            signal
          ),
        enabled,
      },
      {
        queryKey: [
          'validators',
          'fct_sync_committee_participation_by_validator_hourly',
          currentNetwork?.name,
          indicesString,
          dayTimestamp,
        ],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctSyncCommitteeParticipationByValidatorHourly>(
            fctSyncCommitteeParticipationByValidatorHourlyServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                hour_start_date_time_gte: dayTimestamp ?? 0,
                hour_start_date_time_lt: dayEnd,
                page_size: 10000,
                order_by: 'hour_start_date_time',
              },
            },
            'fct_sync_committee_participation_by_validator_hourly',
            signal
          ),
        enabled,
      },
      {
        queryKey: ['validators', 'source-misses-hourly', currentNetwork?.name, indicesString, dayTimestamp],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctAttestationVoteCorrectnessByValidator>(
            fctAttestationVoteCorrectnessByValidatorServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                slot_start_date_time_gte: dayTimestamp ?? 0,
                slot_start_date_time_lt: dayEnd,
                source_correct_eq: false,
                page_size: 10000,
              },
            },
            'fct_attestation_vote_correctness_by_validator',
            signal
          ),
        enabled,
      },
      {
        queryKey: ['validators', 'fct_validator_balance_hourly', currentNetwork?.name, indicesString, dayTimestamp],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctValidatorBalanceHourly>(
            fctValidatorBalanceHourlyServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                hour_start_date_time_gte: dayTimestamp ?? 0,
                hour_start_date_time_lt: dayEnd,
                page_size: 10000,
                order_by: 'hour_start_date_time',
              },
            },
            'fct_validator_balance_hourly',
            signal
          ),
        enabled,
      },
    ],
  });

  const [attestationQuery, syncCommitteeQuery, sourceMissQuery, balanceQuery] = results;

  const isLoading =
    attestationQuery.isLoading || syncCommitteeQuery.isLoading || sourceMissQuery.isLoading || balanceQuery.isLoading;
  const error = attestationQuery.error || syncCommitteeQuery.error || sourceMissQuery.error || balanceQuery.error;

  const attestationData = useMemo(() => attestationQuery.data ?? [], [attestationQuery.data]);
  const sourceMissData = useMemo(() => sourceMissQuery.data ?? [], [sourceMissQuery.data]);
  const syncCommitteeData = useMemo(() => syncCommitteeQuery.data ?? [], [syncCommitteeQuery.data]);
  const balanceData = useMemo(() => balanceQuery.data ?? [], [balanceQuery.data]);

  const processedData = useMemo(() => {
    if (!enabled || isLoading) {
      return {
        attestationHourly: [] as AttestationHourlyDataPoint[],
        syncCommitteeHourly: [] as SyncCommitteeHourlyDataPoint[],
        balanceHourly: [] as BalanceHourlyDataPoint[],
      };
    }

    return {
      attestationHourly: transformAttestationHourly(attestationData, sourceMissData),
      syncCommitteeHourly: transformSyncCommitteeHourly(syncCommitteeData),
      balanceHourly: transformBalanceHourly(balanceData),
    };
  }, [enabled, isLoading, attestationData, sourceMissData, syncCommitteeData, balanceData]);

  return {
    ...processedData,
    isLoading,
    error: error as Error | null,
    hasData: attestationData.length > 0 || syncCommitteeData.length > 0 || balanceData.length > 0,
  };
}
