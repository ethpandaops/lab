import { Phase } from './types';
import { PROPAGATION_DEFAULT_TIME, ATTESTATION_DEFAULT_TIME, ACCEPTANCE_DEFAULT_TIME } from './utils';

// Helper function to determine the current phase
export const getCurrentPhase = (
  currentTime: number,
  nodeBlockSeen: Record<string, number>,
  nodeBlockP2P: Record<string, number>,
  blockTime?: number,
  attestationsCount: number = 0,
  totalExpectedAttestations: number = 0
): Phase => {
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

  // If we don't have real timing data, use defaults
  const propagationTime = earliestNodeTime !== Infinity ? earliestNodeTime : PROPAGATION_DEFAULT_TIME;
  
  // Attestation phase starts when attestations start coming in
  // We'll start 1.5s after propagation begins as a default
  const attestationTime = propagationTime + 1500;

  // Check if we have real attestation data
  const hasAttestationData = attestationsCount > 0 && totalExpectedAttestations > 0;
  
  // Accepted phase starts when 66% of attestations are received
  // Only use attestation data if we actually have it
  const isAttestation66PercentComplete = hasAttestationData && 
    attestationsCount >= (totalExpectedAttestations * 0.66);

  // If we have 66% of attestations, move to accepted phase
  if (isAttestation66PercentComplete && currentTime >= attestationTime) {
    return Phase.Accepted;
  }
  
  // If we're in attestation phase time and have attestations or it's just attestation time
  if (currentTime >= attestationTime) {
    // We've reached attestation time, so we're at least in the attesting phase
    // Only upgrade to accepted phase if we have the required 66% attestations
    return Phase.Attesting;
  }
  
  // If we're in propagation phase
  if (currentTime >= propagationTime) {
    return Phase.Propagating;
  }
  
  // Otherwise we're in the building phase
  return Phase.Building;
};

// Helper function to determine if we're in the Propagation phase (legacy)
export const isInPropagationPhase = (
  currentTime: number, 
  nodeBlockSeen: Record<string, number>, 
  nodeBlockP2P: Record<string, number>
): boolean => {
  const phase = getCurrentPhase(currentTime, nodeBlockSeen, nodeBlockP2P);
  return phase !== Phase.Building;
};