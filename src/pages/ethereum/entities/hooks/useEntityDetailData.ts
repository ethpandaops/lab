import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  fctAttestationLivenessByEntityHeadServiceListOptions,
  fctBlockProposerEntityServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctAttestationLivenessByEntityHead, FctBlockProposerEntity } from '@/api/types.gen';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToEpoch, epochToTimestamp, slotToTimestamp } from '@/utils/beacon';

import type {
  EntityDetailData,
  EntityStats,
  EntityEpochData,
  UseEntityDetailDataReturn,
} from './useEntityDetailData.types';

/**
 * Hook to fetch comprehensive data for a single entity
 *
 * Queries:
 * - fct_attestation_liveness_by_entity_head: 12 hours of attestation data
 * - fct_block_proposer_entity: 12 hours of block proposal data
 *
 * Charts and statistics both use last 12 hours only.
 * The most recent epoch is excluded from charts as it's still in progress.
 *
 * @param entity - Entity name
 * @returns Comprehensive entity data including stats and time series (12h)
 */
export function useEntityDetailData(entity: string): UseEntityDetailDataReturn {
  const { currentNetwork } = useNetwork();
  const { slot: currentSlot } = useBeaconClock();

  // Calculate time range - memoized to prevent refetch on every slot change
  // Only recalculate when half-day boundary changes
  const halfDayBoundary = useMemo(() => Math.floor(currentSlot / (12 * 60 * 5)), [currentSlot]);

  const twelveHoursAgo = useMemo(() => {
    if (!currentNetwork) return 0;
    const slotsIn12Hours = 12 * 60 * 5;
    return slotToTimestamp(Math.max(0, currentSlot - slotsIn12Hours), currentNetwork.genesis_time);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSlot intentionally excluded to prevent refetch on every slot change
  }, [currentNetwork, halfDayBoundary]);

  // Fetch 12h data (used for both charts and stats)
  const results = useQueries({
    queries: [
      // 1. 12h attestation liveness data
      {
        ...fctAttestationLivenessByEntityHeadServiceListOptions({
          query: {
            entity_eq: entity,
            slot_start_date_time_gte: twelveHoursAgo,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && !!entity && twelveHoursAgo > 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
      // 2. 12h block proposer data
      {
        ...fctBlockProposerEntityServiceListOptions({
          query: {
            entity_eq: entity,
            slot_start_date_time_gte: twelveHoursAgo,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && !!entity && twelveHoursAgo > 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const isLoading = results.some(result => result.isLoading);
  const error = results.find(result => result.error)?.error as Error | null;

  // Process data
  const data = useMemo<EntityDetailData | null>(() => {
    if (isLoading || error || !currentNetwork) {
      return null;
    }

    const [attestation12hResult, blockProposer12hResult] = results;

    // 12h data (used for both charts and stats)
    const attestation12hData =
      (attestation12hResult?.data as { fct_attestation_liveness_by_entity_head?: FctAttestationLivenessByEntityHead[] })
        ?.fct_attestation_liveness_by_entity_head ?? [];

    const blockProposer12hData =
      (blockProposer12hResult?.data as { fct_block_proposer_entity?: FctBlockProposerEntity[] })
        ?.fct_block_proposer_entity ?? [];

    // Group attestation data by epoch for 12h time series
    const epochAttestationMap = new Map<
      number,
      {
        totalAttestations: number;
        missedAttestations: number;
        lastSlot: number;
      }
    >();

    attestation12hData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const slot = record.slot ?? 0;
      const epoch = slotToEpoch(slot);
      const count = record.attestation_count ?? 0;
      const isMissed = record.status?.toLowerCase() === 'missed';

      if (!epochAttestationMap.has(epoch)) {
        epochAttestationMap.set(epoch, {
          totalAttestations: 0,
          missedAttestations: 0,
          lastSlot: slot,
        });
      }

      const epochData = epochAttestationMap.get(epoch)!;

      if (isMissed) {
        epochData.missedAttestations += count;
      } else {
        epochData.totalAttestations += count;
      }

      if (slot > epochData.lastSlot) {
        epochData.lastSlot = slot;
      }
    });

    // Group block proposer data by epoch for 12h time series
    const epochBlockMap = new Map<number, { count: number; lastSlot: number }>();

    blockProposer12hData.forEach((record: FctBlockProposerEntity) => {
      const slot = record.slot ?? 0;
      const epoch = slotToEpoch(slot);

      if (!epochBlockMap.has(epoch)) {
        epochBlockMap.set(epoch, { count: 0, lastSlot: slot });
      }

      const blockData = epochBlockMap.get(epoch)!;
      blockData.count += 1;

      if (slot > blockData.lastSlot) {
        blockData.lastSlot = slot;
      }
    });

    // Build time series data
    const allEpochs = new Set([...epochAttestationMap.keys(), ...epochBlockMap.keys()]);
    const sortedEpochs = Array.from(allEpochs).sort((a, b) => a - b);

    // Filter out the most recent epoch (still in progress)
    const maxEpoch = sortedEpochs.length > 0 ? sortedEpochs[sortedEpochs.length - 1] : 0;
    const epochData: EntityEpochData[] = sortedEpochs
      .filter(epoch => epoch !== maxEpoch)
      .map(epoch => {
        const attestationStats = epochAttestationMap.get(epoch) ?? {
          totalAttestations: 0,
          missedAttestations: 0,
          lastSlot: 0,
        };
        const blockStats = epochBlockMap.get(epoch) ?? { count: 0, lastSlot: 0 };

        const total = attestationStats.totalAttestations + attestationStats.missedAttestations;
        const rate = total > 0 ? attestationStats.totalAttestations / total : 0;

        return {
          epoch,
          epochStartDateTime: epochToTimestamp(epoch, currentNetwork.genesis_time),
          totalAttestations: attestationStats.totalAttestations,
          missedAttestations: attestationStats.missedAttestations,
          rate,
          blocksProposed: blockStats.count,
        };
      });

    // Calculate 12h statistics
    let totalAttestations12h = 0;
    let missedAttestations12h = 0;

    attestation12hData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const count = record.attestation_count ?? 0;
      const isMissed = record.status?.toLowerCase() === 'missed';

      if (isMissed) {
        missedAttestations12h += count;
      } else {
        totalAttestations12h += count;
      }
    });

    const total12h = totalAttestations12h + missedAttestations12h;
    const rate12h = total12h > 0 ? totalAttestations12h / total12h : 0;

    // Estimate validator count (average attestations per epoch)
    const validatorCount = epochData.length > 0 ? Math.round(total12h / epochData.length) : 0;

    // Count blocks proposed (12h)
    const blocksProposed12h = blockProposer12hData.length;

    // Find last active slot
    let lastActiveSlot = 0;

    attestation12hData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const slot = record.slot ?? 0;
      if (slot > lastActiveSlot) {
        lastActiveSlot = slot;
      }
    });

    blockProposer12hData.forEach((record: FctBlockProposerEntity) => {
      const slot = record.slot ?? 0;
      if (slot > lastActiveSlot) {
        lastActiveSlot = slot;
      }
    });

    const lastActive = currentNetwork.genesis_time + lastActiveSlot * 12;

    const stats: EntityStats = {
      entity,
      rate24h: rate12h,
      validatorCount,
      missedAttestations24h: missedAttestations12h,
      blocksProposed24h: blocksProposed12h,
      lastActive,
    };

    return {
      stats,
      epochData,
    };
  }, [results, isLoading, error, currentNetwork, entity]);

  return {
    data,
    isLoading,
    error,
  };
}
