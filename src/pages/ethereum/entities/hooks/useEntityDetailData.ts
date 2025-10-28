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
 * - fct_attestation_liveness_by_entity_head: 30 days of attestation data (all statuses)
 * - fct_block_proposer_entity: 30 days of block proposal data
 * - All-time attestation data for overall statistics
 *
 * Aggregates data by epoch for time series visualization
 * Calculates statistics for 7d, 30d, and all-time periods
 *
 * @param entity - Entity name
 * @returns Comprehensive entity data including stats and time series
 */
export function useEntityDetailData(entity: string): UseEntityDetailDataReturn {
  const { currentNetwork } = useNetwork();
  const { slot: currentSlot } = useBeaconClock();

  // Calculate time ranges - memoized to prevent refetch on every slot change
  // Only recalculate when day boundary changes
  const dayBoundary = useMemo(() => Math.floor(currentSlot / (24 * 60 * 5)), [currentSlot]);

  const thirtyDaysAgo = useMemo(() => {
    if (!currentNetwork) return 0;
    const slotsIn30Days = 30 * 24 * 60 * 5;
    return slotToTimestamp(Math.max(0, currentSlot - slotsIn30Days), currentNetwork.genesis_time);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSlot intentionally excluded to prevent refetch on every slot change
  }, [currentNetwork, dayBoundary]);

  const sevenDaysAgo = useMemo(() => {
    if (!currentNetwork) return 0;
    const slotsIn7Days = 7 * 24 * 60 * 5;
    return slotToTimestamp(Math.max(0, currentSlot - slotsIn7Days), currentNetwork.genesis_time);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSlot intentionally excluded to prevent refetch on every slot change
  }, [currentNetwork, dayBoundary]);

  const ninetyDaysAgo = useMemo(() => {
    if (!currentNetwork) return 0;
    const slotsIn90Days = 90 * 24 * 60 * 5;
    return slotToTimestamp(Math.max(0, currentSlot - slotsIn90Days), currentNetwork.genesis_time);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSlot intentionally excluded to prevent refetch on every slot change
  }, [currentNetwork, dayBoundary]);

  // Fetch data in parallel (4 queries total)
  const results = useQueries({
    queries: [
      // 1. 30-day attestation liveness data
      {
        ...fctAttestationLivenessByEntityHeadServiceListOptions({
          query: {
            entity_eq: entity,
            slot_start_date_time_gte: thirtyDaysAgo,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && !!entity && thirtyDaysAgo > 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
      // 2. 30-day block proposer data
      {
        ...fctBlockProposerEntityServiceListOptions({
          query: {
            entity_eq: entity,
            slot_start_date_time_gte: thirtyDaysAgo,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && !!entity && thirtyDaysAgo > 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
      // 3. All-time attestation liveness data (90 days for all-time stats)
      {
        ...fctAttestationLivenessByEntityHeadServiceListOptions({
          query: {
            entity_eq: entity,
            slot_start_date_time_gte: ninetyDaysAgo,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && !!entity && ninetyDaysAgo > 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
      // 4. All-time block proposer data (90 days)
      {
        ...fctBlockProposerEntityServiceListOptions({
          query: {
            entity_eq: entity,
            slot_start_date_time_gte: ninetyDaysAgo,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && !!entity && ninetyDaysAgo > 0,
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

    const [attestation30dResult, blockProposer30dResult, attestationAllTimeResult, blockProposerAllTimeResult] =
      results;

    const attestation30dData =
      (attestation30dResult?.data as { fct_attestation_liveness_by_entity_head?: FctAttestationLivenessByEntityHead[] })
        ?.fct_attestation_liveness_by_entity_head ?? [];

    const blockProposer30dData =
      (blockProposer30dResult?.data as { fct_block_proposer_entity?: FctBlockProposerEntity[] })
        ?.fct_block_proposer_entity ?? [];

    const attestationAllTimeData =
      (
        attestationAllTimeResult?.data as {
          fct_attestation_liveness_by_entity_head?: FctAttestationLivenessByEntityHead[];
        }
      )?.fct_attestation_liveness_by_entity_head ?? [];

    const blockProposerAllTimeData =
      (blockProposerAllTimeResult?.data as { fct_block_proposer_entity?: FctBlockProposerEntity[] })
        ?.fct_block_proposer_entity ?? [];

    // Group attestation data by epoch for 30-day time series
    const epochAttestationMap = new Map<
      number,
      {
        totalAttestations: number;
        missedAttestations: number;
        lastSlot: number;
      }
    >();

    attestation30dData.forEach((record: FctAttestationLivenessByEntityHead) => {
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

    // Group block proposer data by epoch for 30-day time series
    const epochBlockMap = new Map<number, { count: number; lastSlot: number }>();

    blockProposer30dData.forEach((record: FctBlockProposerEntity) => {
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
    const epochData: EntityEpochData[] = Array.from(allEpochs)
      .sort((a, b) => a - b)
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

    // Calculate statistics for different time periods
    // 7-day stats
    let totalAttestations7d = 0;
    let missedAttestations7d = 0;

    attestation30dData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const slot = record.slot ?? 0;
      const timestamp = currentNetwork.genesis_time + slot * 12;
      if (timestamp >= sevenDaysAgo) {
        const count = record.attestation_count ?? 0;
        const isMissed = record.status?.toLowerCase() === 'missed';

        if (isMissed) {
          missedAttestations7d += count;
        } else {
          totalAttestations7d += count;
        }
      }
    });

    const total7d = totalAttestations7d + missedAttestations7d;
    const rate7d = total7d > 0 ? totalAttestations7d / total7d : 0;

    // 30-day stats
    let totalAttestations30d = 0;
    let missedAttestations30d = 0;

    attestation30dData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const count = record.attestation_count ?? 0;
      const isMissed = record.status?.toLowerCase() === 'missed';

      if (isMissed) {
        missedAttestations30d += count;
      } else {
        totalAttestations30d += count;
      }
    });

    const total30d = totalAttestations30d + missedAttestations30d;
    const rate30d = total30d > 0 ? totalAttestations30d / total30d : 0;

    // All-time stats
    let totalAttestationsAllTime = 0;
    let missedAttestationsAllTime = 0;

    attestationAllTimeData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const count = record.attestation_count ?? 0;
      const isMissed = record.status?.toLowerCase() === 'missed';

      if (isMissed) {
        missedAttestationsAllTime += count;
      } else {
        totalAttestationsAllTime += count;
      }
    });

    const totalAllTime = totalAttestationsAllTime + missedAttestationsAllTime;
    const rateAllTime = totalAllTime > 0 ? totalAttestationsAllTime / totalAllTime : 0;

    // Count blocks proposed (30 days)
    const blocksProposed30d = blockProposer30dData.length;

    // Find last active slot
    let lastActiveSlot = 0;

    attestationAllTimeData.forEach((record: FctAttestationLivenessByEntityHead) => {
      const slot = record.slot ?? 0;
      if (slot > lastActiveSlot) {
        lastActiveSlot = slot;
      }
    });

    blockProposerAllTimeData.forEach((record: FctBlockProposerEntity) => {
      const slot = record.slot ?? 0;
      if (slot > lastActiveSlot) {
        lastActiveSlot = slot;
      }
    });

    const lastActive = currentNetwork.genesis_time + lastActiveSlot * 12;

    const stats: EntityStats = {
      entity,
      rate7d,
      rate30d,
      rateAllTime,
      totalAttestations7d,
      missedAttestations7d,
      totalAttestations30d,
      missedAttestations30d,
      totalAttestationsAllTime,
      missedAttestationsAllTime,
      blocksProposed30d,
      lastActive,
    };

    return {
      stats,
      epochData,
    };
  }, [results, isLoading, error, currentNetwork, entity, sevenDaysAgo]);

  return {
    data,
    isLoading,
    error,
  };
}
