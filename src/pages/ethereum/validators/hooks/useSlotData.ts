import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fctAttestationVoteCorrectnessByValidatorServiceList,
  fctSyncCommitteeParticipationByValidatorServiceList,
  fctValidatorBalanceServiceList,
} from '@/api/sdk.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { useNetwork } from '@/hooks/useNetwork';
import type {
  FctAttestationVoteCorrectnessByValidator,
  FctSyncCommitteeParticipationByValidator,
  FctValidatorBalance,
} from '@/api/types.gen';

/** Per-slot attestation data point */
export interface AttestationSlotDataPoint {
  slot: number;
  slotTimestamp: number;
  validatorIndex: number;
  attested: boolean;
  headCorrect: boolean | null;
  targetCorrect: boolean | null;
  sourceCorrect: boolean | null;
  inclusionDistance: number | null;
}

/** Per-slot sync committee data point */
export interface SyncCommitteeSlotDataPoint {
  slot: number;
  slotTimestamp: number;
  validatorIndex: number;
  participated: boolean;
}

/** Per-epoch balance data point (epoch granularity within the hour) */
export interface BalanceSlotDataPoint {
  epoch: number;
  epochTimestamp: number;
  validatorIndex: number;
  balance: number | null;
}

/** Return type for useSlotData */
interface UseSlotDataReturn {
  attestationSlot: AttestationSlotDataPoint[];
  syncCommitteeSlot: SyncCommitteeSlotDataPoint[];
  balanceSlot: BalanceSlotDataPoint[];
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
}

/**
 * Convert Gwei to ETH
 */
function gweiToEth(gwei: number | null | undefined): number | null {
  if (gwei === null || gwei === undefined) return null;
  return gwei / 1_000_000_000;
}

/**
 * Transform raw attestation slot records to data points
 */
function transformAttestationSlot(data: FctAttestationVoteCorrectnessByValidator[]): AttestationSlotDataPoint[] {
  return data.map(record => ({
    slot: record.slot ?? 0,
    slotTimestamp: record.slot_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    attested: record.attested ?? false,
    headCorrect: record.head_correct ?? null,
    targetCorrect: record.target_correct ?? null,
    sourceCorrect: record.source_correct ?? null,
    inclusionDistance: record.inclusion_distance ?? null,
  }));
}

/**
 * Transform raw sync committee slot records to data points
 */
function transformSyncCommitteeSlot(data: FctSyncCommitteeParticipationByValidator[]): SyncCommitteeSlotDataPoint[] {
  return data.map(record => ({
    slot: record.slot ?? 0,
    slotTimestamp: record.slot_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    participated: record.participated ?? false,
  }));
}

/**
 * Transform raw balance records to data points
 */
function transformBalanceSlot(data: FctValidatorBalance[]): BalanceSlotDataPoint[] {
  return data.map(record => ({
    epoch: record.epoch ?? 0,
    epochTimestamp: record.epoch_start_date_time ?? 0,
    validatorIndex: record.validator_index ?? 0,
    balance: gweiToEth(record.balance),
  }));
}

/**
 * Lazy-loading hook that fetches slot-level data for a single hour + set of validators.
 *
 * When `hourTimestamp` is `null`, all queries are disabled.
 * Fetches attestation, sync committee, and balance data in parallel.
 *
 * @param validatorIndices - Array of validator indices to fetch data for
 * @param hourTimestamp - Start-of-hour Unix timestamp (seconds), or null to disable
 */
export function useSlotData(validatorIndices: number[], hourTimestamp: number | null): UseSlotDataReturn {
  const { currentNetwork } = useNetwork();

  const indicesString = validatorIndices.join(',');
  const enabled = hourTimestamp !== null && validatorIndices.length > 0 && !!currentNetwork;
  const hourEnd = hourTimestamp !== null ? hourTimestamp + 3600 : 0;

  const results = useQueries({
    queries: [
      {
        queryKey: [
          'validators',
          'fct_attestation_vote_correctness_by_validator',
          currentNetwork?.name,
          indicesString,
          hourTimestamp,
        ],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctAttestationVoteCorrectnessByValidator>(
            fctAttestationVoteCorrectnessByValidatorServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                slot_start_date_time_gte: hourTimestamp ?? 0,
                slot_start_date_time_lt: hourEnd,
                page_size: 10000,
                order_by: 'slot_start_date_time',
              },
            },
            'fct_attestation_vote_correctness_by_validator',
            signal
          ),
        enabled,
      },
      {
        queryKey: [
          'validators',
          'fct_sync_committee_participation_by_validator',
          currentNetwork?.name,
          indicesString,
          hourTimestamp,
        ],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctSyncCommitteeParticipationByValidator>(
            fctSyncCommitteeParticipationByValidatorServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                slot_start_date_time_gte: hourTimestamp ?? 0,
                slot_start_date_time_lt: hourEnd,
                page_size: 10000,
                order_by: 'slot_start_date_time',
              },
            },
            'fct_sync_committee_participation_by_validator',
            signal
          ),
        enabled,
      },
      {
        queryKey: ['validators', 'fct_validator_balance', currentNetwork?.name, indicesString, hourTimestamp],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchAllPages<FctValidatorBalance>(
            fctValidatorBalanceServiceList,
            {
              query: {
                validator_index_in_values: indicesString,
                epoch_start_date_time_gte: hourTimestamp ?? 0,
                epoch_start_date_time_lt: hourEnd,
                page_size: 10000,
                order_by: 'epoch_start_date_time',
              },
            },
            'fct_validator_balance',
            signal
          ),
        enabled,
      },
    ],
  });

  const [attestationQuery, syncCommitteeQuery, balanceQuery] = results;

  const isLoading = attestationQuery.isLoading || syncCommitteeQuery.isLoading || balanceQuery.isLoading;
  const error = attestationQuery.error || syncCommitteeQuery.error || balanceQuery.error;

  const attestationData = useMemo(() => attestationQuery.data ?? [], [attestationQuery.data]);
  const syncCommitteeData = useMemo(() => syncCommitteeQuery.data ?? [], [syncCommitteeQuery.data]);
  const balanceData = useMemo(() => balanceQuery.data ?? [], [balanceQuery.data]);

  const processedData = useMemo(() => {
    if (!enabled || isLoading) {
      return {
        attestationSlot: [] as AttestationSlotDataPoint[],
        syncCommitteeSlot: [] as SyncCommitteeSlotDataPoint[],
        balanceSlot: [] as BalanceSlotDataPoint[],
      };
    }

    return {
      attestationSlot: transformAttestationSlot(attestationData),
      syncCommitteeSlot: transformSyncCommitteeSlot(syncCommitteeData),
      balanceSlot: transformBalanceSlot(balanceData),
    };
  }, [enabled, isLoading, attestationData, syncCommitteeData, balanceData]);

  return {
    ...processedData,
    isLoading,
    error: error as Error | null,
    hasData: attestationData.length > 0 || syncCommitteeData.length > 0 || balanceData.length > 0,
  };
}
