import { useMemo } from 'react';
import {
  CubeIcon,
  ArrowPathIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { PhaseData } from '@/components/Ethereum/SlotProgressTimeline/SlotProgressTimeline.types';
import type { SlotProgressRawData, UseSlotProgressDataReturn } from './useSlotProgressData.types';

/**
 * Transforms raw API data into phase data for the SlotProgressTimeline component (static mode).
 *
 * Calculates exact timing for all 6 phases based on historical slot data:
 * 1. Builders - MEV bidding phase
 * 2. Relaying - Block relay phase
 * 3. Proposing - Block proposal phase
 * 4. Gossiping - Block propagation phase
 * 5. Attesting - Attestation arrival phase
 * 6. Accepted - Block acceptance phase (66% threshold)
 *
 * Unlike the live view version, this hook operates in static mode:
 * - No `currentTime` parameter needed
 * - All phases marked as `isCompleted: true`
 * - Works with array data structures (extracting first element)
 * - Shows exact historical timing
 *
 * @param rawData - Raw API data from useSlotDetailData (with arrays)
 * @returns Phase data, status flags, and loading state
 */
export function useSlotProgressData(rawData: SlotProgressRawData): UseSlotProgressDataReturn {
  const phases = useMemo<PhaseData[]>(() => {
    const { blockHead, blockProposer, blockMev, blockPropagation, attestations, committees, mevBidding, relayBids } =
      rawData;

    const phasesList: PhaseData[] = [];

    // Calculate total expected validators from committee data
    const totalExpectedValidators = committees.reduce((sum, committee) => {
      return sum + (committee.validators?.length ?? 0);
    }, 0);

    // Calculate 66% threshold for acceptance
    const acceptanceThreshold = Math.ceil(totalExpectedValidators * 0.66);

    // Determine block status
    const blockStatus = blockProposer?.status ?? 'unknown';
    const isMissed = blockStatus === 'missed' || !blockHead;
    const hasBlockPropagation = blockPropagation.length > 0;

    // If block is missed, return minimal phase data
    if (isMissed) {
      return [
        {
          id: 'proposing',
          label: 'Proposing',
          icon: UserIcon,
          color: 'danger',
          description: 'Block proposal phase',
          stats: 'Block never seen',
          isCompleted: true,
        },
      ];
    }

    // Get first block seen timestamp (minimum of all seen_slot_start_diff)
    const firstBlockSeenTime = hasBlockPropagation
      ? Math.min(...blockPropagation.map(node => node.seen_slot_start_diff ?? Infinity))
      : undefined;

    // Calculate 50th percentile (median) propagation time
    const sortedPropagationTimes = blockPropagation.map(node => node.seen_slot_start_diff ?? 0).sort((a, b) => a - b);
    const medianPropagationTime =
      sortedPropagationTimes.length > 0
        ? sortedPropagationTimes[Math.floor(sortedPropagationTimes.length / 2)]
        : undefined;

    // Phase 1: Builders (MEV Bidding)
    // Use mevBidding data to find earliest bid
    if (mevBidding.length > 0 && blockMev) {
      // Find earliest bid time from mevBidding chunks
      const sortedBids = [...mevBidding].sort(
        (a, b) => (a.chunk_slot_start_diff ?? 0) - (b.chunk_slot_start_diff ?? 0)
      );
      const earliestBidTime = sortedBids[0]?.chunk_slot_start_diff ?? 0;

      // Count unique builders from mevBidding data
      const uniqueBuilders = new Set(mevBidding.map(bid => bid.builder_pubkey).filter(Boolean));
      const builderCount = uniqueBuilders.size;

      const buildersEndTime = firstBlockSeenTime ?? 0;

      phasesList.push({
        id: 'builders',
        label: 'Builders',
        icon: CubeIcon,
        color: 'secondary',
        timestamp: earliestBidTime,
        duration: buildersEndTime - earliestBidTime,
        description: 'Block builders bidding phase',
        stats: `${builderCount} builder${builderCount !== 1 ? 's' : ''} bidded for this slot`,
        isCompleted: true,
      });

      // Phase 2: Relaying
      const relayCount = relayBids.length;

      if (relayCount > 0) {
        phasesList.push({
          id: 'relaying',
          label: 'Relaying',
          icon: ArrowPathIcon,
          color: 'secondary',
          timestamp: buildersEndTime,
          description: 'Block relay phase',
          stats: `${relayCount} relay${relayCount !== 1 ? 's' : ''} involved`,
          isCompleted: true,
        });
      }
    }

    // Phase 3: Proposing
    if (firstBlockSeenTime !== undefined) {
      phasesList.push({
        id: 'proposing',
        label: 'Proposing',
        icon: UserIcon,
        color: 'secondary',
        timestamp: firstBlockSeenTime,
        description: 'Block proposed to network',
        stats: undefined,
        isCompleted: true,
      });
    }

    // Phase 4: Gossiping (Block Propagation)
    if (hasBlockPropagation && firstBlockSeenTime !== undefined && medianPropagationTime !== undefined) {
      const nodeCount = blockPropagation.length;
      const gossipDuration = medianPropagationTime - firstBlockSeenTime;

      phasesList.push({
        id: 'gossiping',
        label: 'Gossiping',
        icon: ChatBubbleBottomCenterTextIcon,
        color: 'secondary',
        timestamp: firstBlockSeenTime,
        duration: gossipDuration,
        description: 'Block propagating to network',
        stats: `${nodeCount} node${nodeCount !== 1 ? 's' : ''} from Xatu saw this block`,
        isCompleted: true,
      });
    }

    // Phase 5 & 6: Attesting and Acceptance
    if (attestations.length > 0 && totalExpectedValidators > 0) {
      // Find first attestation arrival time
      const sortedAttestations = [...attestations].sort(
        (a, b) => (a.chunk_slot_start_diff ?? 0) - (b.chunk_slot_start_diff ?? 0)
      );
      const firstAttestationTime = sortedAttestations[0].chunk_slot_start_diff ?? 0;

      // Calculate cumulative attestation counts to find 66% threshold
      let cumulativeCount = 0;
      let acceptanceTime: number | undefined;
      let totalAttestationCount = 0;

      for (const chunk of sortedAttestations) {
        const count = chunk.attestation_count ?? 0;
        cumulativeCount += count;
        totalAttestationCount += count;

        if (acceptanceTime === undefined && cumulativeCount >= acceptanceThreshold) {
          acceptanceTime = chunk.chunk_slot_start_diff ?? 0;
        }
      }

      const attestationPercentage = ((totalAttestationCount / totalExpectedValidators) * 100).toFixed(1);

      // Phase 5: Attesting
      const attestingDuration = acceptanceTime ? acceptanceTime - firstAttestationTime : undefined;

      phasesList.push({
        id: 'attesting',
        label: 'Attesting',
        icon: CheckCircleIcon,
        color: 'secondary',
        timestamp: firstAttestationTime,
        duration: attestingDuration,
        description: 'Validators attesting to block',
        stats: `${attestationPercentage}% of the attesters voted for this block`,
        isCompleted: true,
      });

      // Phase 6: Accepted (if 66% threshold reached)
      if (acceptanceTime !== undefined) {
        const acceptanceSeconds = (acceptanceTime / 1000).toFixed(1);

        phasesList.push({
          id: 'accepted',
          label: 'Accepted',
          icon: LockClosedIcon,
          color: 'secondary',
          timestamp: acceptanceTime,
          description: 'Block achieved acceptance',
          stats: `This block achieved acceptance at ${acceptanceSeconds}s`,
          isCompleted: true,
        });
      }
    }

    return phasesList;
  }, [rawData]);

  // Compute status flags
  const { isMissed, isOrphaned, isAccepted, isLoading } = useMemo(() => {
    const blockStatus = rawData.blockProposer?.status ?? 'unknown';
    const missed = blockStatus === 'missed' || !rawData.blockHead;
    const orphaned = blockStatus === 'orphaned';
    const accepted = phases.some(phase => phase.id === 'accepted');
    const loading = !rawData.blockProposer && !rawData.blockHead;

    return {
      isMissed: missed,
      isOrphaned: orphaned,
      isAccepted: accepted,
      isLoading: loading,
    };
  }, [rawData, phases]);

  return {
    phases,
    isMissed,
    isOrphaned,
    isAccepted,
    isLoading,
  };
}
