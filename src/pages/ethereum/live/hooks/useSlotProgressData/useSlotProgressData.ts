import { useMemo } from 'react';
import { CubeIcon, ArrowPathIcon, UserIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import type { PhaseData } from '@/components/Ethereum/SlotProgressTimeline/SlotProgressTimeline.types';
import type { SlotProgressRawData, UseSlotProgressDataReturn } from './useSlotProgressData.types';

/**
 * Transforms raw API data into phase data for the SlotProgressTimeline component.
 *
 * ALWAYS returns all 5 phases regardless of data availability:
 * 1. Builders - MEV bidding phase (always starts at t=0)
 * 2. Relaying - Winning MEV bid selected
 * 3. Proposing - Block proposal/first seen
 * 4. Attesting - Attestation arrival phase
 * 5. Accepted - Block acceptance phase (66% threshold)
 *
 * @param rawData - Raw API data from useSlotViewData
 * @returns Phase data, status flags, and loading state
 */
export function useSlotProgressData(rawData: SlotProgressRawData): UseSlotProgressDataReturn {
  const phases = useMemo<PhaseData[]>(() => {
    const { blockHead, blockProposer, blockPropagation, attestations, committees, mevBidding, relayBids } = rawData;

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

    // Get first block seen timestamp (minimum of all seen_slot_start_diff)
    const firstBlockSeenTime = hasBlockPropagation
      ? Math.min(...blockPropagation.map(node => node.seen_slot_start_diff ?? Infinity))
      : undefined;

    // MEV Bidding Data
    const uniqueBuilders = new Set(mevBidding.map(bid => bid.builder_pubkey)).size;
    const builderCount = uniqueBuilders > 0 ? uniqueBuilders : 0;
    const relayCount = relayBids.length;

    // Attestation data - calculate cumulative attestation counts to find 66% threshold
    const sortedAttestations = [...attestations].sort(
      (a, b) => (a.chunk_slot_start_diff ?? 0) - (b.chunk_slot_start_diff ?? 0)
    );

    let cumulativeCount = 0;
    let acceptanceTime: number | undefined;
    for (const chunk of sortedAttestations) {
      const count = chunk.attestation_count ?? 0;
      cumulativeCount += count;

      if (acceptanceTime === undefined && cumulativeCount >= acceptanceThreshold) {
        acceptanceTime = chunk.chunk_slot_start_diff ?? 0;
      }
    }

    // Get winning bid time (when proposer selected the winning MEV bid)
    // Using firstBlockSeenTime as a proxy since we don't have exact relay selection time
    const winningBidTime = firstBlockSeenTime;

    // ALWAYS construct all 5 phases (removed Gossiping)
    const allPhases: PhaseData[] = [
      // Phase 1: Builders - Always starts at t=0
      {
        id: 'builders',
        label: 'Builders',
        icon: CubeIcon,
        color: 'secondary',
        timestamp: 0, // Always start at slot start
        description: 'MEV builders bidding phase',
        stats: builderCount > 0 ? `${builderCount} builder${builderCount > 1 ? 's' : ''}` : undefined,
      },
      // Phase 2: Relaying - When winning bid was selected
      {
        id: 'relaying',
        label: 'Relaying',
        icon: ArrowPathIcon,
        color: 'secondary',
        timestamp: winningBidTime,
        description: 'Winning MEV bid selected',
        stats: relayCount > 0 ? `${relayCount} relay${relayCount !== 1 ? 's' : ''}` : undefined,
      },
      // Phase 3: Proposing - When block first seen
      {
        id: 'proposing',
        label: 'Proposing',
        icon: UserIcon,
        color: 'secondary',
        timestamp: firstBlockSeenTime,
        description: isMissed ? 'Block was never proposed' : 'Block proposed to network',
        stats: undefined,
      },
      // Phase 4: Attesting - starts 50ms after Proposing
      {
        id: 'attesting',
        label: 'Attesting',
        icon: CheckCircleIcon,
        color: 'secondary',
        timestamp: firstBlockSeenTime !== undefined ? firstBlockSeenTime + 50 : undefined,
        duration:
          firstBlockSeenTime !== undefined && acceptanceTime !== undefined
            ? acceptanceTime - (firstBlockSeenTime + 50)
            : undefined,
        description: 'Validators attesting to block',
        stats: undefined,
      },
      // Phase 5: Accepted
      {
        id: 'accepted',
        label: 'Accepted',
        icon: LockClosedIcon,
        color: 'secondary',
        timestamp: acceptanceTime,
        description: 'Block achieved acceptance',
        stats: acceptanceTime !== undefined ? `>66%` : undefined,
      },
    ];

    return allPhases;
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
