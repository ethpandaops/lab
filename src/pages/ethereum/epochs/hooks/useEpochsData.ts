import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  fctBlockProposerHeadServiceListOptions,
  fctAttestationCorrectnessHeadServiceListOptions,
  fctAttestationLivenessByEntityHeadServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockProposerHead,
  FctAttestationCorrectnessHead,
  FctAttestationLivenessByEntityHead,
} from '@/api/types.gen';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { getEpochSlotRange } from '@/utils/beacon';

import type { EpochData, MissedAttestationByEntity, UseEpochsDataReturn } from './useEpochsData.types';

/**
 * Hook to fetch data for the last 10 epochs
 *
 * Queries using slot range for each epoch:
 * - fct_block_proposer_head: Get block proposal data (canonical, missed)
 * - fct_attestation_correctness_head: Get attestation data
 * - fct_attestation_liveness_by_entity_head: Get missed attestations by entity
 *
 * @returns Epoch data for the last 10 epochs and missed attestations by entity
 */
export function useEpochsData(): UseEpochsDataReturn {
  const { currentNetwork } = useNetwork();
  const { epoch: currentEpoch } = useBeaconClock();

  // Generate array of last 10 epochs with their slot ranges
  const epochs = useMemo(() => {
    const result: Array<{ epoch: number; firstSlot: number; lastSlot: number }> = [];
    for (let i = 0; i < 10; i++) {
      const epoch = Math.max(0, currentEpoch - i);
      const { firstSlot, lastSlot } = getEpochSlotRange(epoch);
      result.push({ epoch, firstSlot, lastSlot });
    }
    return result;
  }, [currentEpoch]);

  // Query block proposer, attestation, and liveness data for all epochs in parallel
  const results = useQueries({
    queries: epochs.flatMap(({ firstSlot, lastSlot }) => [
      // Block proposer data
      {
        ...fctBlockProposerHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // Attestation correctness data
      {
        ...fctAttestationCorrectnessHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // Missed attestations by entity
      {
        ...fctAttestationLivenessByEntityHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            status_eq: 'missed',
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
    ]),
  });

  // Check loading and error states
  const isLoading = results.some(result => result.isLoading);
  const error = results.find(result => result.error)?.error as Error | null;

  // Process data into EpochData format and missed attestations by entity
  const { epochsData, missedAttestationsByEntity } = useMemo<{
    epochsData: EpochData[];
    missedAttestationsByEntity: MissedAttestationByEntity[];
  }>(() => {
    if (isLoading || error || !currentNetwork) {
      return { epochsData: [], missedAttestationsByEntity: [] };
    }

    const epochsData = epochs.map(({ epoch, firstSlot }, index) => {
      // Get results for this epoch (3 queries per epoch)
      const blockProposerResult = results[index * 3];
      const attestationResult = results[index * 3 + 1];

      // Type assertion needed because useQueries returns a union type
      const blockProposerData =
        (blockProposerResult?.data as { fct_block_proposer_head?: FctBlockProposerHead[] })?.fct_block_proposer_head ??
        [];
      const attestationData =
        (attestationResult?.data as { fct_attestation_correctness_head?: FctAttestationCorrectnessHead[] })
          ?.fct_attestation_correctness_head ?? [];

      // Count blocks - each epoch has exactly 32 slots
      const SLOTS_PER_EPOCH = 32;

      // Get unique slots with canonical blocks (filter by block_root presence and dedupe by slot)
      const slotsWithBlocks = new Set<number>();
      blockProposerData.forEach((b: FctBlockProposerHead) => {
        if (b.block_root && b.slot !== undefined) {
          slotsWithBlocks.add(b.slot);
        }
      });

      const canonicalBlockCount = slotsWithBlocks.size;
      const missedBlockCount = SLOTS_PER_EPOCH - canonicalBlockCount;

      // Sum attestations
      const totalAttestations = attestationData.reduce(
        (sum: number, a: FctAttestationCorrectnessHead) => sum + (a.votes_head ?? 0) + (a.votes_other ?? 0),
        0
      );
      const expectedAttestations = attestationData.reduce(
        (sum: number, a: FctAttestationCorrectnessHead) => sum + (a.votes_max ?? 0),
        0
      );
      const missedAttestations = Math.max(0, expectedAttestations - totalAttestations);

      const participationRate = expectedAttestations > 0 ? totalAttestations / expectedAttestations : 0;

      // Calculate epoch start time from first slot
      const epochStartDateTime = currentNetwork.genesis_time + firstSlot * 12;

      return {
        epoch,
        epochStartDateTime,
        canonicalBlockCount,
        missedBlockCount,
        totalAttestations,
        missedAttestations,
        participationRate,
      };
    });

    // Aggregate missed attestations by entity across all epochs
    const entityMap = new Map<string, Map<number, number>>();

    epochs.forEach(({ epoch }, index) => {
      const livenessResult = results[index * 3 + 2];
      const livenessData =
        (
          livenessResult?.data as {
            fct_attestation_liveness_by_entity_head?: FctAttestationLivenessByEntityHead[];
          }
        )?.fct_attestation_liveness_by_entity_head ?? [];

      livenessData.forEach((record: FctAttestationLivenessByEntityHead) => {
        const entity = record.entity ?? 'Unknown';
        const count = record.attestation_count ?? 0;
        if (!entityMap.has(entity)) {
          entityMap.set(entity, new Map());
        }
        const epochMap = entityMap.get(entity)!;
        const currentCount = epochMap.get(epoch) ?? 0;
        epochMap.set(epoch, currentCount + count);
      });
    });

    // Convert to array format - include all missed attestations
    // Chart component will handle filtering for top N entities by total sum
    const missedAttestationsByEntity: MissedAttestationByEntity[] = [];
    entityMap.forEach((epochMap, entity) => {
      epochMap.forEach((count, epoch) => {
        missedAttestationsByEntity.push({ entity, epoch, count });
      });
    });

    return { epochsData, missedAttestationsByEntity };
  }, [epochs, results, isLoading, error, currentNetwork]);

  return {
    epochs: epochsData,
    missedAttestationsByEntity,
    isLoading,
    error,
    currentEpoch,
  };
}
