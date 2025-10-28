import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  fctBlockProposerHeadServiceListOptions,
  fctBlockBlobCountHeadServiceListOptions,
  fctAttestationCorrectnessHeadServiceListOptions,
  fctBlockProposerEntityServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
  fctAttestationLivenessByEntityHeadServiceListOptions,
  fctBlockMevHeadServiceListOptions,
  fctBlockHeadServiceListOptions,
  intBlockCanonicalServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { epochToTimestamp, getEpochSlotRange, slotToTimestamp } from '@/utils/beacon';

import type {
  EpochDetailData,
  EpochStats,
  SlotData,
  SlotMissedAttestationEntity,
  UseEpochDetailDataReturn,
} from './useEpochDetailData.types';

/**
 * Hook to fetch comprehensive data for a single epoch
 *
 * Queries using slot range (slot_gte/slot_lte) for all 32 slots in the epoch:
 * - Block proposer data
 * - Blob counts
 * - Attestation correctness
 * - Proposer entities
 * - Block first seen times
 * - Attestation liveness by entity
 *
 * @param epoch - Epoch number
 * @returns Comprehensive epoch data including slots, stats, and missed attestations
 */
export function useEpochDetailData(epoch: number): UseEpochDetailDataReturn {
  const { currentNetwork } = useNetwork();

  const epochStartTime = currentNetwork ? epochToTimestamp(epoch, currentNetwork.genesis_time) : 0;
  const { firstSlot, lastSlot } = getEpochSlotRange(epoch);

  // Fetch data for all slots in the epoch using range queries (9 total queries)
  const results = useQueries({
    queries: [
      // 1. Block proposer data
      {
        ...fctBlockProposerHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
            order_by: 'slot asc',
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // 2. Blob counts
      {
        ...fctBlockBlobCountHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // 3. Attestation correctness
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
      // 4. Proposer entities
      {
        ...fctBlockProposerEntityServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // 5. Block first seen by nodes (get all, will filter to earliest per slot)
      {
        ...fctBlockFirstSeenByNodeServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 10000,
            order_by: 'slot asc, seen_slot_start_diff asc',
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // 6. Attestation liveness by entity (only missed)
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
      // 7. MEV data
      {
        ...fctBlockMevHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // 8. Block head data (for gas, transactions, base fee)
      {
        ...fctBlockHeadServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
      // 9. Canonical blocks (for determining canonical vs proposed status)
      {
        ...intBlockCanonicalServiceListOptions({
          query: {
            slot_gte: firstSlot,
            slot_lte: lastSlot,
            slot_start_date_time_gte: currentNetwork ? slotToTimestamp(firstSlot, currentNetwork.genesis_time) : 0,
            slot_start_date_time_lte: currentNetwork ? slotToTimestamp(lastSlot, currentNetwork.genesis_time) : 0,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && firstSlot >= 0,
      },
    ],
  });

  const isLoading = results.some(result => result.isLoading);
  // Only fail on errors from critical queries (first 7), not the block head/canonical queries (index 7, 8)
  const error = results.slice(0, 7).find(result => result.error)?.error as Error | null;

  // Process data
  const data = useMemo<EpochDetailData | null>(() => {
    if (isLoading || error || !currentNetwork) {
      return null;
    }

    const [
      blockProposerResult,
      blobCountResult,
      attestationResult,
      proposerEntityResult,
      blockFirstSeenResult,
      attestationLivenessResult,
      mevDataResult,
      blockHeadResult,
      blockCanonicalResult,
    ] = results;

    const blockProposerData = blockProposerResult.data?.fct_block_proposer_head ?? [];
    const blobCountData = blobCountResult.data?.fct_block_blob_count_head ?? [];
    const attestationData = attestationResult.data?.fct_attestation_correctness_head ?? [];
    const proposerEntityData = proposerEntityResult.data?.fct_block_proposer_entity ?? [];
    const blockFirstSeenData = blockFirstSeenResult.data?.fct_block_first_seen_by_node ?? [];
    const attestationLivenessData = attestationLivenessResult.data?.fct_attestation_liveness_by_entity_head ?? [];
    const mevData = mevDataResult.data?.fct_block_mev_head ?? [];
    const blockHeadData = blockHeadResult.data?.fct_block_head ?? [];
    const blockCanonicalData = blockCanonicalResult.data?.int_block_canonical ?? [];

    // Create maps and sets for efficient lookups
    const blobCountMap = new Map(blobCountData.map(b => [b.slot, b.blob_count ?? 0]));
    const attestationMap = new Map(
      attestationData.map(a => [
        a.slot,
        {
          head: a.votes_head ?? 0,
          other: a.votes_other ?? 0,
          max: a.votes_max ?? 0,
        },
      ])
    );
    const proposerEntityMap = new Map(proposerEntityData.map(p => [p.slot, p.entity ?? null]));

    // Track which slots have blocks in head chain and canonical chain
    const slotsInHeadChain = new Set(blockHeadData.map(b => b.slot).filter((s): s is number => s !== undefined));
    const slotsInCanonicalChain = new Set(
      blockCanonicalData.map(b => b.slot).filter((s): s is number => s !== undefined)
    );

    // Calculate earliest block seen time per slot
    const blockFirstSeenMap = new Map<number, number>();
    blockFirstSeenData.forEach(record => {
      const slot = record.slot;
      const seenTime = record.seen_slot_start_diff;
      if (slot !== undefined && seenTime !== undefined && seenTime !== null) {
        const currentMin = blockFirstSeenMap.get(slot);
        if (currentMin === undefined || seenTime < currentMin) {
          blockFirstSeenMap.set(slot, seenTime);
        }
      }
    });

    // Build map from proposer data first
    const proposerMap = new Map(
      blockProposerData.map(p => [
        p.slot ?? 0,
        {
          blockRoot: p.block_root ?? null,
          proposerIndex: p.proposer_validator_index ?? null,
        },
      ])
    );

    // Generate all 32 slots for the epoch
    const SLOTS_PER_EPOCH = 32;
    const slots: SlotData[] = Array.from({ length: SLOTS_PER_EPOCH }, (_, i) => {
      const slot = firstSlot + i;
      const proposerInfo = proposerMap.get(slot);
      const attestation = attestationMap.get(slot) ?? { head: 0, other: 0, max: 0 };
      const blockFirstSeenTime = blockFirstSeenMap.get(slot) ?? null;
      const timestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;

      // Determine status based on presence in head and canonical chains
      let status: string;
      if (slotsInCanonicalChain.has(slot)) {
        status = 'canonical';
      } else if (slotsInHeadChain.has(slot)) {
        status = 'proposed';
      } else {
        status = 'missed';
      }

      return {
        slot,
        slotStartDateTime: timestamp,
        blockRoot: proposerInfo?.blockRoot ?? null,
        proposerIndex: proposerInfo?.proposerIndex ?? null,
        proposerEntity: proposerEntityMap.get(slot) ?? null,
        blobCount: blobCountMap.get(slot) ?? 0,
        status,
        attestationHead: attestation.head,
        attestationOther: attestation.other,
        attestationMax: attestation.max,
        blockFirstSeenTime,
      };
    });

    // Calculate stats - count unique slots with blocks
    const slotsWithBlocks = new Set<number>();
    slots.forEach(s => {
      if (s.blockRoot !== null) {
        slotsWithBlocks.add(s.slot);
      }
    });

    const canonicalBlockCount = slotsWithBlocks.size;
    const missedBlockCount = SLOTS_PER_EPOCH - canonicalBlockCount;
    const orphanedBlockCount = 0; // Only head chain, no orphans

    const totalAttestations = slots.reduce((sum, s) => sum + s.attestationHead + s.attestationOther, 0);
    const expectedAttestations = slots.reduce((sum, s) => sum + s.attestationMax, 0);
    const missedAttestations = Math.max(0, expectedAttestations - totalAttestations);
    const participationRate = expectedAttestations > 0 ? totalAttestations / expectedAttestations : 0;

    const blockSeenTimes = slots.map(s => s.blockFirstSeenTime).filter((t): t is number => t !== null);
    const averageBlockFirstSeenTime =
      blockSeenTimes.length > 0 ? blockSeenTimes.reduce((sum, t) => sum + t, 0) / blockSeenTimes.length : null;

    const stats: EpochStats = {
      epoch,
      epochStartDateTime: epochStartTime,
      canonicalBlockCount,
      missedBlockCount,
      orphanedBlockCount,
      totalAttestations,
      expectedAttestations,
      missedAttestations,
      participationRate,
      averageBlockFirstSeenTime,
    };

    // Process missed attestations by entity
    const missedAttestationsByEntity: SlotMissedAttestationEntity[] = attestationLivenessData
      .filter(record => record.status?.toLowerCase() === 'missed')
      .map(record => ({
        slot: record.slot ?? 0,
        entity: record.entity ?? 'unknown',
        count: record.attestation_count ?? 0,
      }));

    // Calculate top 10 entities by total missed attestations
    const entityTotals = new Map<string, number>();
    missedAttestationsByEntity.forEach(record => {
      const current = entityTotals.get(record.entity) ?? 0;
      entityTotals.set(record.entity, current + record.count);
    });

    const topMissedEntities = Array.from(entityTotals.entries())
      .map(([entity, count]) => ({ entity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Build MEV time series - one data point per slot
    const mevMap = new Map(
      mevData.map(m => [
        m.slot,
        {
          builder: m.builder_pubkey ?? null,
          relay: m.relay_names && m.relay_names.length > 0 ? m.relay_names[0] : null, // Use first relay if multiple
          blockValue: m.value ?? null,
        },
      ])
    );

    const mevTimeSeries = Array.from({ length: 32 }, (_, i) => {
      const slot = firstSlot + i;
      const mevInfo = mevMap.get(slot);
      return {
        slot,
        hasMev: !!mevInfo,
        builder: mevInfo?.builder ?? null,
        relay: mevInfo?.relay ?? null,
        blockValue: mevInfo?.blockValue ?? null,
      };
    });

    // Build block production quality time series - one data point per slot
    const blockHeadMap = new Map(
      blockHeadData.map(b => [
        b.slot,
        {
          gasUsed: b.execution_payload_gas_used ?? null,
          gasLimit: b.execution_payload_gas_limit ?? null,
          transactionCount: b.execution_payload_transactions_count ?? null,
          baseFeePerGas: b.execution_payload_base_fee_per_gas ?? null,
          blobGasUsed: b.execution_payload_blob_gas_used ?? null,
          excessBlobGas: b.execution_payload_excess_blob_gas ?? null,
        },
      ])
    );

    const blockProductionTimeSeries = Array.from({ length: 32 }, (_, i) => {
      const slot = firstSlot + i;
      const blockInfo = blockHeadMap.get(slot);
      const blobCount = blobCountMap.get(slot) ?? 0; // Use existing blob count data we already fetch
      return {
        slot,
        blobCount,
        gasUsed: blockInfo?.gasUsed ?? null,
        gasLimit: blockInfo?.gasLimit ?? null,
        transactionCount: blockInfo?.transactionCount ?? null,
        baseFeePerGas: blockInfo?.baseFeePerGas ? Number(blockInfo.baseFeePerGas) / 1e9 : null, // Convert wei to gwei
        blobGasUsed: blockInfo?.blobGasUsed ?? null,
        excessBlobGas: blockInfo?.excessBlobGas ?? null,
      };
    });

    // Build block size time series - one data point per slot
    // Prefer head data over canonical for latest block sizes
    const blockSizeMap = new Map(
      blockHeadData.map(b => [
        b.slot,
        {
          consensusSize: b.block_total_bytes ?? null,
          consensusSizeCompressed: b.block_total_bytes_compressed ?? null,
          executionSize: b.execution_payload_transactions_total_bytes ?? null,
          executionSizeCompressed: b.execution_payload_transactions_total_bytes_compressed ?? null,
        },
      ])
    );

    const blockSizeTimeSeries = Array.from({ length: 32 }, (_, i) => {
      const slot = firstSlot + i;
      const sizeInfo = blockSizeMap.get(slot);
      return {
        slot,
        consensusSize: sizeInfo?.consensusSize ?? null,
        consensusSizeCompressed: sizeInfo?.consensusSizeCompressed ?? null,
        executionSize: sizeInfo?.executionSize ?? null,
        executionSizeCompressed: sizeInfo?.executionSizeCompressed ?? null,
      };
    });

    return {
      stats,
      slots,
      missedAttestationsByEntity,
      topMissedEntities,
      mevTimeSeries,
      blockProductionTimeSeries,
      blockSizeTimeSeries,
    };
  }, [results, isLoading, error, currentNetwork, epoch, epochStartTime, firstSlot]);

  return {
    data,
    isLoading,
    error,
  };
}
