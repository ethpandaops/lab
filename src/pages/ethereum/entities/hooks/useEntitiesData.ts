import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  fctAttestationLivenessByEntityHeadServiceListOptions,
  fctBlockProposerEntityServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctAttestationLivenessByEntityHead, FctBlockProposerEntity } from '@/api/types.gen';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { epochToTimestamp, getEpochSlotRange } from '@/utils/beacon';

import type { EntitySummary, UseEntitiesDataReturn } from './useEntitiesData.types';

/**
 * Hook to fetch summary data for all entities
 *
 * Queries last finalized epoch (current epoch - 2):
 * - fct_attestation_liveness_by_entity_head: Get all attestation data (missed and successful)
 * - fct_block_proposer_entity: Get block proposal data
 *
 * Groups data by entity on client side and calculates:
 * - Online/offline status (based on attestation activity)
 * - Validator count (unique validators attesting)
 * - Attestation rate
 * - Blocks proposed
 *
 * @returns Entity summary data for all entities in the last finalized epoch
 */
export function useEntitiesData(): UseEntitiesDataReturn {
  const { currentNetwork } = useNetwork();
  const { epoch: currentEpoch } = useBeaconClock();

  // Use last finalized epoch (current - 2)
  // Memoize to prevent refetch on every epoch change
  const lastFinalizedEpoch = useMemo(() => Math.max(0, currentEpoch - 2), [currentEpoch]);

  // Get slot range for the last finalized epoch
  const { firstSlot, lastSlot } = useMemo(() => getEpochSlotRange(lastFinalizedEpoch), [lastFinalizedEpoch]);

  // Get epoch start timestamp for filtering
  const epochStartTime = useMemo(() => {
    if (!currentNetwork) return 0;
    return epochToTimestamp(lastFinalizedEpoch, currentNetwork.genesis_time);
  }, [currentNetwork, lastFinalizedEpoch]);

  // Get slot start date time range for filtering (API now uses timestamps instead of slot numbers)
  const { firstSlotTime, lastSlotTime } = useMemo(() => {
    if (!currentNetwork) return { firstSlotTime: 0, lastSlotTime: 0 };
    return {
      firstSlotTime: currentNetwork.genesis_time + firstSlot * 12,
      lastSlotTime: currentNetwork.genesis_time + lastSlot * 12,
    };
  }, [currentNetwork, firstSlot, lastSlot]);

  // Fetch attestation liveness and block proposer data in parallel
  const results = useQueries({
    queries: [
      // All attestation liveness data for the last finalized epoch
      // Note: API limits page_size to 10,000 max (1 epoch may exceed this)
      {
        ...fctAttestationLivenessByEntityHeadServiceListOptions({
          query: {
            slot_start_date_time_gte: firstSlotTime,
            slot_start_date_time_lte: lastSlotTime,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && firstSlotTime > 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
      // Block proposer entity data for the last finalized epoch
      {
        ...fctBlockProposerEntityServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const isLoading = results.some(result => result.isLoading);
  const error = results.find(result => result.error)?.error as Error | null;

  // Process data into entity summaries
  const entities = useMemo<EntitySummary[]>(() => {
    if (isLoading || error || !currentNetwork) {
      return [];
    }

    const [attestationResult, blockProposerResult] = results;

    const attestationData =
      (attestationResult?.data as { fct_attestation_liveness_by_entity_head?: FctAttestationLivenessByEntityHead[] })
        ?.fct_attestation_liveness_by_entity_head ?? [];
    const blockProposerData =
      (blockProposerResult?.data as { fct_block_proposer_entity?: FctBlockProposerEntity[] })
        ?.fct_block_proposer_entity ?? [];

    // Group attestation data by entity
    const entityMap = new Map<
      string,
      {
        totalAttestations: number;
        missedAttestations: number;
        validatorCount: number;
      }
    >();

    attestationData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const entity = record.entity ?? 'Unknown';
      const attestationCount = record.attestation_count ?? 0;
      const missedCount = record.missed_count ?? 0;

      if (!entityMap.has(entity)) {
        entityMap.set(entity, {
          totalAttestations: 0,
          missedAttestations: 0,
          validatorCount: 0,
        });
      }

      const entityData = entityMap.get(entity)!;

      // Count attestations
      entityData.totalAttestations += attestationCount;
      entityData.missedAttestations += missedCount;

      // Validator count = total attestations (successful + missed, each validator attests once per epoch)
      entityData.validatorCount += attestationCount + missedCount;
    });

    // Group block proposer data by entity
    const blockCountMap = new Map<string, number>();

    blockProposerData.forEach((record: FctBlockProposerEntity) => {
      const entity = record.entity ?? 'Unknown';
      blockCountMap.set(entity, (blockCountMap.get(entity) ?? 0) + 1);
    });

    // Combine data and calculate rates, filtering out null/undefined entities
    const entitySummaries: EntitySummary[] = [];

    entityMap.forEach((attestationStats, entity) => {
      if (!entity || entity === 'Unknown') {
        return; // Skip unknown entities
      }

      const blocksProposed = blockCountMap.get(entity) ?? 0;
      const totalAttestations = attestationStats.totalAttestations + attestationStats.missedAttestations;
      const rate = totalAttestations > 0 ? attestationStats.totalAttestations / totalAttestations : 0;

      // Determine online status: online if attestation rate >= 95%
      const isOnline = rate >= 0.95;

      entitySummaries.push({
        entity,
        totalAttestations: attestationStats.totalAttestations,
        missedAttestations: attestationStats.missedAttestations,
        rate,
        blocksProposed,
        validatorCount: attestationStats.validatorCount,
        isOnline,
        lastActive: epochStartTime,
      });
    });

    // Sort by validator count (most validators first)
    return entitySummaries.sort((a, b) => b.validatorCount - a.validatorCount);
  }, [results, isLoading, error, currentNetwork, epochStartTime]);

  return {
    entities,
    isLoading,
    error,
  };
}
