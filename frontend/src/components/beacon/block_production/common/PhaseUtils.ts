import { Phase } from './types';
import {
  PROPAGATION_DEFAULT_TIME,
  ATTESTATION_DEFAULT_TIME,
  ACCEPTANCE_DEFAULT_TIME,
} from './utils';

// Helper function to determine the current phase
export const getCurrentPhase = (
  currentTime: number,
  nodeBlockSeen: Record<string, number>,
  nodeBlockP2P: Record<string, number>,
  blockTime?: number,
  attestationsCount: number = 0,
  totalExpectedAttestations: number = 0,
): Phase | null => {
  // REQUIREMENT 1: Always show Building phase even with no data (this prevents "Waiting for data...")
  // Check if we have at least one of: node seen times, node P2P times, or block time
  const hasNodeSeenData = Object.keys(nodeBlockSeen).length > 0;
  const hasNodeP2PData = Object.keys(nodeBlockP2P).length > 0;
  const hasBlockTimeData = blockTime !== undefined;

  // Instead of returning null, default to Building phase
  // if (!hasNodeSeenData && !hasNodeP2PData && !hasBlockTimeData) {
  //   return null; // No data about the block at all, don't show any phase
  // }

  // Find the earliest time any node saw the block (propagation start time)
  let earliestNodeTime = Infinity;

  // Check API timings
  Object.values(nodeBlockSeen).forEach(time => {
    if (typeof time === 'number') {
      earliestNodeTime = Math.min(earliestNodeTime, time);
    }
  });

  // Check P2P timings
  Object.values(nodeBlockP2P).forEach(time => {
    if (typeof time === 'number') {
      earliestNodeTime = Math.min(earliestNodeTime, time);
    }
  });

  // Use block time if available and earlier than node times
  if (blockTime !== undefined && blockTime < earliestNodeTime) {
    earliestNodeTime = blockTime;
  }

  // REQUIREMENT 2: If we've never seen the block, we stay in building phase
  // No propagation defaults - if we never see the block, we never exit the build stage
  if (earliestNodeTime === Infinity || (!hasNodeSeenData && !hasNodeP2PData && !hasBlockTimeData)) {
    return Phase.Building; // No block seen, stay in building phase
  }

  // REQUIREMENT 3: Check for attestation data
  const hasAttestationData = attestationsCount > 0;
  const hasExpectedAttestations = totalExpectedAttestations > 0;

  // REQUIREMENT 4: Accepted phase starts at 66% attestations
  const is66PercentAttested =
    hasAttestationData &&
    hasExpectedAttestations &&
    attestationsCount >= totalExpectedAttestations * 0.66;

  // If we have 66% of attestations, move to accepted phase
  if (is66PercentAttested) {
    return Phase.Accepted;
  }

  // REQUIREMENT 3: Attestation phase starts when first attestation is seen
  if (hasAttestationData) {
    return Phase.Attesting;
  }

  // If we've seen the block but no attestations yet, we're in propagating phase
  if (earliestNodeTime !== Infinity && earliestNodeTime <= currentTime) {
    return Phase.Propagating;
  }

  // Otherwise we're in the building phase
  return Phase.Building;
};

// Helper function to determine if we're in the Propagation phase (legacy)
export const isInPropagationPhase = (
  currentTime: number,
  nodeBlockSeen: Record<string, number>,
  nodeBlockP2P: Record<string, number>,
): boolean => {
  const phase = getCurrentPhase(currentTime, nodeBlockSeen, nodeBlockP2P);
  return phase !== Phase.Building;
};
