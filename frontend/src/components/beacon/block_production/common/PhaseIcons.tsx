import React, { useMemo } from 'react';
import { Phase } from './types';
import { getCurrentPhase } from './PhaseUtils';
import { countUniqueBuilderPubkeys } from './utils';
import { hasNonEmptyDeliveredPayloads } from './blockUtils';

interface PhaseIconsProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  bids: Array<{
    relayName: string;
    value: number;
    time: number;
    blockHash?: string;
    builderPubkey?: string;
    isWinning?: boolean;
  }>;
  winningBid?: {
    relayName: string;
    value: number;
  } | null;
  proposer?: {
    proposerValidatorIndex?: number;
  };
  nodes?: Record<string, any>;
  slotData?: any;
  firstContinentToSeeBlock?: string | null;
  isLocallyBuilt?: boolean;
}

// Define phase configurations
const phases = [
  {
    id: 'builder',
    icon: '🤖',
    title: 'Builders',
    description: 'Builders compete amongst each other to create the most profitable blocks.',
    color: 'orange' as const,
    nextColor: 'green',
  },
  {
    id: 'relay',
    icon: '🔄',
    title: 'Relaying',
    description: 'Relays connect builders and proposers, allowing proposers to select blocks.',
    color: 'green' as const,
    nextColor: 'amber',
  },
  {
    id: 'proposer',
    icon: '👤',
    title: 'Proposing',
    description:
      "The proposer is selected to create this slot's block, choosing the best bid or building a block themselves.",
    color: 'amber' as const,
    nextColor: 'purple',
  },
  {
    id: 'node',
    icon: '🖥️',
    title: 'Gossiping',
    description: 'Beacon nodes gossip the proposed blocks amongst themselves.',
    color: 'purple' as const,
    nextColor: 'blue',
  },
  {
    id: 'attester',
    icon: '✓',
    title: 'Attesting',
    description: 'Attesters validate and verify the block, and attest to its correctness.',
    color: 'blue' as const,
    nextColor: 'green',
  },
  {
    id: 'accepted',
    icon: '🔒',
    title: 'Accepted',
    description:
      "Once 66% of the slot's attesters have voted for the block, it's unlikely to be re-orged out.",
    color: 'green' as const,
    nextColor: '',
  },
];

const PhaseIcons: React.FC<PhaseIconsProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  bids,
  winningBid,
  proposer,
  nodes = {},
  slotData,
  firstContinentToSeeBlock,
  isLocallyBuilt = false,
}) => {
  // Check if we need to override isLocallyBuilt based on the slotData content
  const effectiveIsLocallyBuilt = useMemo(() => {
    try {
      // If the explicit prop is already false, respect that
      if (!isLocallyBuilt) {
        return false;
      }

      // Try a more thorough check on both block and slotData
      if (slotData) {
        // Pass both block and slotData for complete checking
        const hasDeliveredPayloads = hasNonEmptyDeliveredPayloads(slotData.block, slotData);
        if (hasDeliveredPayloads) {
          return false; // Not locally built if we have delivered payloads
        }
      }

      // Use the provided isLocallyBuilt value
      return isLocallyBuilt;
    } catch (error) {
      // Fall back to the passed-in value in case of errors
      return isLocallyBuilt;
    }
  }, [isLocallyBuilt, slotData]);

  // Extract the attestation data from slotData based on its format
  let attestationsData = null;

  try {
    // If slotData is an object with numeric keys (desktop format), get the first slot's data
    if (slotData && typeof slotData === 'object') {
      const keys = Object.keys(slotData);
      if (keys.length > 0 && !isNaN(Number(keys[0]))) {
        // Desktop format: slotData is keyed by slot number
        const firstKey = keys[0];
        attestationsData = slotData[firstKey]?.attestations;
      } else {
        // Mobile format: slotData has attestations directly
        attestationsData = slotData?.attestations;
      }
    }
  } catch (error) {
    console.error('Error extracting attestation data:', error);
    attestationsData = null;
  }

  // Get attestation data for phase calculation - using startMs instead of inclusionDelay
  const attestationsCount =
    attestationsData?.windows?.reduce((total: number, window: any) => {
      // CRITICAL FIX: Use startMs instead of inclusionDelay
      if (window.startMs !== undefined && Number(window.startMs) <= currentTime) {
        return total + (window.validatorIndices?.length || 0);
      }
      return total;
    }, 0) || 0;

  // Use actual maximumVotes for expected attestations, with no default
  const totalExpectedAttestations = attestationsData?.maximumVotes
    ? Number(attestationsData.maximumVotes)
    : 0;

  // Calculate the current phase
  const currentPhase = getCurrentPhase(
    currentTime,
    nodeBlockSeen,
    nodeBlockP2P,
    blockTime,
    attestationsCount,
    totalExpectedAttestations,
  );

  // Calculate which relay is active
  const activeRelays = React.useMemo(() => {
    const relaysSet = new Set(
      bids.filter(bid => bid.time <= currentTime).map(bid => bid.relayName),
    );
    return relaysSet.size;
  }, [bids, currentTime]);

  // Helper function to determine if an entity should be active in current phase
  // Modified to keep entities active once they've been activated
  const isActiveInPhase = (
    entity: 'builder' | 'relay' | 'proposer' | 'node' | 'attester' | 'accepted',
  ) => {
    // REQUIREMENT 1: If we don't have a phase (null), default to showing Building phase
    if (currentPhase === null) {
      // When no phase data is available, show builders and relays as active
      return entity === 'builder' || entity === 'relay';
    }

    // Keep each entity active once its phase has been reached or passed
    switch (entity) {
      case 'builder':
        // Builders are always active
        return true;
      case 'relay':
        // Relays are always active
        return true;
      case 'proposer':
        // Proposer active during/after propagation phase
        return currentPhase !== Phase.Building;
      case 'node':
        // Nodes active during/after propagation phase
        return currentPhase !== Phase.Building;
      case 'attester':
        // Attesters active during/after attestation phase
        return currentPhase === Phase.Attesting || currentPhase === Phase.Accepted;
      case 'accepted':
        // Accepted only active during accepted phase
        return currentPhase === Phase.Accepted;
      default:
        return false;
    }
  };

  // Function to get dynamic content for each phase
  const getDynamicContent = (phaseId: string) => {
    switch (phaseId) {
      case 'builder':
        return bids.length > 0 ? (
          <>
            {countUniqueBuilderPubkeys(bids)} builder
            {countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''} bidded for this slot
          </>
        ) : (
          <>Waiting...</>
        );

      case 'relay':
        return activeRelays > 0 ? (
          <>
            {activeRelays} relay{activeRelays > 1 ? 's' : ''} were involved in this slot.
          </>
        ) : (
          <>Waiting...</>
        );

      case 'proposer':
        return proposer ? (
          <>
            {effectiveIsLocallyBuilt ? (
              <span className="font-medium">Locally built by proposer</span>
            ) : (
              <span>Built via external builder</span>
            )}
            <div className="mt-1 text-xs truncate max-w-full">
              {slotData?.entity ? (
                <span className="truncate block" title={`Validator: ${slotData.entity}`}>
                  {slotData.entity.length > 12
                    ? `${slotData.entity.substring(0, 10)}...`
                    : slotData.entity}
                </span>
              ) : (
                proposer.proposerValidatorIndex && (
                  <span className="truncate block">
                    Validator: {proposer.proposerValidatorIndex}
                  </span>
                )
              )}
            </div>
          </>
        ) : (
          <>Waiting...</>
        );

      case 'node':
        return Object.keys(nodes).length > 0 ? (
          <>{Object.keys(nodes).length} nodes from Xatu saw this block</>
        ) : (
          <>Waiting...</>
        );

      case 'attester':
        // REQUIREMENT 3 & 4: Calculate attestation percentage based on actual data with max from the slot
        let visibleAttestationsCount = 0;
        let totalExpectedAttestations = 0;

        // Get the maximum expected attestations from the slot data
        // Use the already extracted attestationsData variable
        if (attestationsData?.maximumVotes) {
          totalExpectedAttestations = Number(attestationsData.maximumVotes);
        }

        // Count attestations that have been included up to the current time
        if (attestationsData?.windows && Array.isArray(attestationsData.windows)) {
          attestationsData.windows.forEach((window: any) => {
            // Use the same method as in the phase calculation above
            if (window.startMs !== undefined && Number(window.startMs) <= currentTime) {
              visibleAttestationsCount += window.validatorIndices?.length || 0;
            }
          });
        }

        // Show percentage in attestation or accepted phase
        if (
          (isActiveInPhase('attester') || isActiveInPhase('accepted')) &&
          totalExpectedAttestations > 0
        ) {
          // Calculate percentage
          const percentage = Math.min(
            100,
            Math.round((visibleAttestationsCount / totalExpectedAttestations) * 100),
          );
          return `${percentage}% of the attesters voted for this block`;
        }

        return 'Waiting...';

      case 'accepted':
        if (isActiveInPhase('accepted') && attestationsData?.windows) {
          // Calculate when it hit 66% attestations (acceptance time)
          let acceptanceTime = Infinity;
          const totalExpectedAttestations = attestationsData?.maximumVotes
            ? Number(attestationsData.maximumVotes)
            : 0;

          if (totalExpectedAttestations > 0) {
            // Threshold for 66% of attestations
            const threshold = Math.ceil(totalExpectedAttestations * 0.66);
            let cumulativeAttestations = 0;

            // Sort windows by time
            const sortedWindows = [...(attestationsData.windows || [])].sort((a, b) => {
              return Number(a.startMs || Infinity) - Number(b.startMs || Infinity);
            });

            // Find the window when we reach 66%
            for (const window of sortedWindows) {
              if (window.startMs !== undefined && window.validatorIndices?.length) {
                cumulativeAttestations += window.validatorIndices.length;

                if (cumulativeAttestations >= threshold) {
                  acceptanceTime = Number(window.startMs);
                  break;
                }
              }
            }
          }

          // Format the acceptance time
          if (acceptanceTime !== Infinity) {
            return `This block achieved acceptance at ${(acceptanceTime / 1000).toFixed(1)}s`;
          }

          return 'Accepted';
        }
        return 'Waiting...';

      default:
        return 'Waiting...';
    }
  };

  // Create a badge for the proposer icon if locally built
  const getProposerBadge = () => {
    if (effectiveIsLocallyBuilt) {
      return (
        <div
          className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-4xl z-50"
          role="img"
          aria-label="Locally Built Crown"
          style={{ filter: 'drop-shadow(0 0 4px gold)' }}
        >
          👑
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-10">
      {/* Container with responsive grid for phases and flow lines */}
      <div className="grid grid-cols-11 w-full min-w-0">
        {phases.map((phase, index) => (
          <React.Fragment key={phase.id}>
            {/* Each phase gets its own column */}
            <div className="col-span-1 flex flex-col items-center min-w-0">
              {/* Icon */}
              <div
                className={`w-14 h-14 flex items-center justify-center rounded-full shadow-md transition-colors duration-300 relative ${
                  isActiveInPhase(phase.id as any)
                    ? `bg-gradient-to-br from-${phase.color}-500/60 to-${phase.color}-600/30 border-2 border-${phase.color}-400/80` // Active
                    : currentPhase === Phase.Propagating ||
                        currentPhase === Phase.Attesting ||
                        currentPhase === Phase.Accepted
                      ? `bg-gradient-to-br from-${phase.color}-500/30 to-${phase.color}-600/10 border-2 border-${phase.color}-400/40` // Completed
                      : 'bg-surface border border-border/80' // Not yet active
                }`}
              >
                {phase.id === 'proposer' && getProposerBadge()}
                <div
                  className={`text-2xl ${isActiveInPhase(phase.id as any) ? 'opacity-90' : 'opacity-50'}`}
                  role="img"
                  aria-label={phase.title}
                >
                  {phase.icon}
                </div>
              </div>

              {/* Title */}
              <div
                className={`font-medium text-sm mt-2 mb-1 text-center ${
                  isActiveInPhase(phase.id as any) ? `text-${phase.color}-300` : 'text-primary/70'
                }`}
              >
                {phase.title}
              </div>

              {/* Description */}
              <div
                className={`text-[12px] leading-tight text-left min-h-[75px] transition-opacity duration-300 w-full px-1 ${
                  isActiveInPhase(phase.id as any) ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <span
                  className={`${isActiveInPhase(phase.id as any) ? 'text-white/90' : 'text-tertiary'} line-clamp-4 break-words`}
                >
                  {phase.description}
                </span>
              </div>

              {/* Dynamic content */}
              <div
                className={`text-[12px] leading-tight text-center mt-2 transition-opacity duration-300 w-full min-h-[48px] ${
                  isActiveInPhase(phase.id as any) ? 'opacity-100' : 'opacity-60'
                }`}
              >
                {getDynamicContent(phase.id) === 'Waiting...' ? (
                  /* Skeleton loader for waiting state */
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={`h-2 w-3/4 rounded-full bg-${phase.color}-400/20 animate-pulse`}
                    ></div>
                    <div
                      className={`h-2 w-2/3 rounded-full bg-${phase.color}-400/20 animate-pulse`}
                    ></div>
                  </div>
                ) : (
                  <span
                    className={`${isActiveInPhase(phase.id as any) ? `text-${phase.color}-300` : 'text-tertiary'} break-words line-clamp-3`}
                  >
                    {getDynamicContent(phase.id)}
                  </span>
                )}
                {phase.id === 'proposer' &&
                  currentPhase !== Phase.Building &&
                  blockTime !== undefined && (
                    <div className="text-xs font-mono text-success mt-1 whitespace-nowrap">
                      {(blockTime / 1000).toFixed(1)}s
                    </div>
                  )}
              </div>
            </div>

            {/* Flow line after each phase except the last one */}
            {index < phases.length - 1 && (
              <div className="col-span-1 flex items-center h-14">
                <div
                  className={`h-1.5 w-full rounded-full shadow-inner ${
                    // Only apply the gradient when both phases are active or when second phase is active/completed
                    isActiveInPhase(phase.id as any) &&
                    (isActiveInPhase(phases[index + 1].id as any) ||
                      currentPhase === Phase.Propagating ||
                      currentPhase === Phase.Attesting ||
                      currentPhase === Phase.Accepted)
                      ? `bg-gradient-to-r from-${phase.color}-400 to-${phases[index + 1].color}-400`
                      : 'bg-gray-700/30' // Dimmed state
                  }`}
                  style={{
                    opacity:
                      isActiveInPhase(phase.id as any) &&
                      (isActiveInPhase(phases[index + 1].id as any) ||
                        currentPhase === Phase.Propagating ||
                        currentPhase === Phase.Attesting ||
                        currentPhase === Phase.Accepted)
                        ? 0.8
                        : 0.4,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default PhaseIcons;
