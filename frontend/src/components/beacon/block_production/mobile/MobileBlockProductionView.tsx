import React, { useMemo } from 'react';
import { BlockProductionBaseProps } from '../common/types';
import { isInPropagationPhase } from '../common/PhaseUtils';
import { countUniqueBuilderPubkeys } from '../common/utils';
import MobileTimelineBar from './MobileTimelineBar';
import StageCard from './StageCard';
import MobileContinentsPanel from './MobileContinentsPanel';
import useTimeline from '@/contexts/timeline';

interface MobileBlockProductionViewProps extends BlockProductionBaseProps {
  // Navigation controls for merged timeline
  slotNumber: number | null;
  headLagSlots: number;
  displaySlotOffset: number;
  goToPreviousSlot: () => void;
  goToNextSlot: () => void;
  resetToCurrentSlot: () => void;
  isNextDisabled: boolean;
  network: string; // Add network parameter for blockchain visualization
  slotData?: any; // Add slot data with attestation info (same as in desktop view)
  isLocallyBuilt?: boolean; // Flag to indicate if the block was locally built
}

const MobileBlockProductionView: React.FC<MobileBlockProductionViewProps> = ({
  bids,
  currentTime,
  winningBid,
  proposer,
  proposerEntity,
  nodes = {},
  blockTime,
  nodeBlockSeen = {},
  nodeBlockP2P = {},
  block,
  // Navigation controls
  slotNumber,
  headLagSlots,
  displaySlotOffset,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  isNextDisabled,
  network,
  slotData,
  isLocallyBuilt = false,
}) => {
  // Get time and play state from context
  const { currentTimeMs, isPlaying, togglePlayPause } = useTimeline();
  currentTime = currentTimeMs;
  // Get active status based on role and phase
  const isActive = (role: 'builder' | 'relay' | 'proposer' | 'node' | 'attester') => {
    // Determine transition point - when first node saw block or fallback to 5s
    let transitionTime = 5000; // Default fallback transition time

    // Try to find earliest node timing from available data
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

    // If we have real timing data, use it as transition point
    if (earliestNodeTime !== Infinity) {
      transitionTime = earliestNodeTime;
    } else if (blockTime) {
      // If we have block time but no node data, use block time
      transitionTime = blockTime;
    } else if (winningBid) {
      // If we have winning bid but no block time, estimate based on winning bid
      const winningBidTime = bids.find(bid => bid.isWinning)?.time;
      if (winningBidTime) {
        transitionTime = winningBidTime + 1000; // Roughly 1s after winning bid
      }
    }

    // Calculate whether we have attestation data
    const hasAttestationData =
      slotData?.attestations?.windows &&
      Array.isArray(slotData.attestations.windows) &&
      slotData.attestations.windows.some(
        (window: any) =>
          window.startMs !== undefined &&
          Number(window.startMs) <= currentTime &&
          window.validatorIndices?.length > 0,
      );

    // For each role, determine if it's active based on the phase
    // Modified to keep icons active once they've been activated during the slot
    switch (role) {
      case 'builder':
        // Builders are always active
        return true;

      case 'relay':
        // Relays are always active
        return true;

      case 'proposer':
        // Proposer activates just before transition to propagation and stays active
        return currentTime >= transitionTime - 500;

      case 'node':
        // Nodes activate at the transition point and stay active
        return currentTime >= transitionTime;

      case 'attester':
        // Attesters activate when we have attestation data
        return hasAttestationData;
    }

    // Function should never reach here since all cases are handled above
    return false;
  };

  // Count unique relays
  const activeRelays = useMemo(() => {
    const relaysSet = new Set(
      bids.filter(bid => bid.time <= currentTime).map(bid => bid.relayName),
    );
    return relaysSet.size;
  }, [bids, currentTime]);

  // Calculate which continent saw the block first
  const firstContinentToSeeBlock = useMemo(() => {
    let earliestContinent = null;
    let earliestTime = Infinity;

    // Create a mapping of nodes to continents
    const nodeContinent: Record<string, string> = {};
    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (node.geo?.continent) {
        nodeContinent[nodeId] = node.geo.continent;
      }
    });

    // Examine API timings
    Object.entries(nodeBlockSeen).forEach(([nodeId, time]) => {
      if (typeof time === 'number' && time <= currentTime) {
        const continent = nodeContinent[nodeId];
        if (continent && time < earliestTime) {
          earliestTime = time;
          earliestContinent = continent;
        }
      }
    });

    // Examine P2P timings
    Object.entries(nodeBlockP2P).forEach(([nodeId, time]) => {
      if (typeof time === 'number' && time <= currentTime) {
        const continent = nodeContinent[nodeId];
        if (continent && time < earliestTime) {
          earliestTime = time;
          earliestContinent = continent;
        }
      }
    });

    // Map continent code to full name
    const continentFullNames: Record<string, string> = {
      NA: 'North America',
      SA: 'South America',
      EU: 'Europe',
      AS: 'Asia',
      AF: 'Africa',
      OC: 'Oceania',
      AN: 'Antarctica',
    };

    return earliestContinent ? continentFullNames[earliestContinent] || earliestContinent : null;
  }, [nodes, nodeBlockSeen, nodeBlockP2P, currentTime]);

  // Extract attestation counts for the timeline
  const { attestationsCount, totalExpectedAttestations } = useMemo(() => {
    if (!slotData?.attestations) {
      return { attestationsCount: 0, totalExpectedAttestations: 0 };
    }

    // Count attestations that have been included up to the current time
    let visibleAttestationsCount = 0;

    if (slotData.attestations.windows && Array.isArray(slotData.attestations.windows)) {
      slotData.attestations.windows.forEach((window: any) => {
        if (window.startMs !== undefined && Number(window.startMs) <= currentTime) {
          visibleAttestationsCount += window.validatorIndices?.length || 0;
        }
      });
    }

    // Get the maximum expected attestations from the slot data
    const maxExpectedAttestations = slotData.attestations.maximumVotes
      ? Number(slotData.attestations.maximumVotes)
      : 0;

    return {
      attestationsCount: visibleAttestationsCount,
      totalExpectedAttestations: maxExpectedAttestations,
    };
  }, [slotData, currentTime]);

  // Calculate attestation percentage for display
  const attestationPercentage = useMemo(() => {
    if (totalExpectedAttestations > 0 && attestationsCount > 0) {
      return Math.min(100, Math.round((attestationsCount / totalExpectedAttestations) * 100));
    }
    return 0;
  }, [attestationsCount, totalExpectedAttestations]);

  return (
    <div className="flex flex-col w-full">
      {/* Timeline with Phase Icons and Key Information - solid background */}
      <div className="bg-surface border border-subtle shadow-sm rounded-lg mb-3">
        <MobileTimelineBar
          currentTime={currentTime}
          nodeBlockSeen={nodeBlockSeen}
          nodeBlockP2P={nodeBlockP2P}
          blockTime={blockTime}
          attestationsCount={attestationsCount}
          totalExpectedAttestations={totalExpectedAttestations}
          slotData={slotData}
          // Navigation controls
          slotNumber={slotNumber}
          headLagSlots={headLagSlots}
          displaySlotOffset={displaySlotOffset}
          isPlaying={isPlaying}
          goToPreviousSlot={goToPreviousSlot}
          goToNextSlot={goToNextSlot}
          resetToCurrentSlot={resetToCurrentSlot}
          togglePlayPause={togglePlayPause}
          isNextDisabled={isNextDisabled}
        />

        {/* Mobile-optimized cards for each stage */}
        <div className="grid grid-cols-1 gap-3 p-3">
          {/* Builders Stage */}
          <StageCard
            title="Builders"
            emoji="🤖"
            emojiLabel="Robot (Builder)"
            isActive={isActive('builder')}
            isInPropagationPhase={isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)}
            subtitle={
              bids.length > 0
                ? `${countUniqueBuilderPubkeys(bids)} builder${countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''} total`
                : 'Waiting for blocks...'
            }
            value={winningBid ? `${winningBid.value.toFixed(4)} ETH` : undefined}
          />

          {/* Relays Stage */}
          <StageCard
            title="MEV Relays"
            emoji="🔄"
            emojiLabel="MEV Relay"
            isActive={isActive('relay')}
            isInPropagationPhase={isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)}
            subtitle={
              winningBid?.deliveredRelays?.length
                ? `Delivered by ${winningBid.deliveredRelays.join(', ')}`
                : winningBid
                  ? `via ${winningBid.relayName}`
                  : activeRelays > 0
                    ? `${activeRelays} relay${activeRelays > 1 ? 's' : ''}`
                    : 'Waiting for relays...'
            }
          />

          {/* Proposer Stage - Beacon Block Card */}
          <div
            className={`rounded-lg overflow-hidden border shadow-sm ${isActive('proposer') ? 'bg-surface border-subtle' : 'bg-surface/90 border-subtle/50 opacity-80'} transition-opacity duration-300`}
          >
            <div className="flex items-center p-3 relative">
              {/* Locally built crown */}
              {isLocallyBuilt && (
                <div
                  className="absolute -top-1 left-4 transform text-3xl z-50"
                  role="img"
                  aria-label="Locally Built Crown"
                  style={{ filter: 'drop-shadow(0 0 4px gold)' }}
                >
                  👑
                </div>
              )}
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
                  isActive('proposer')
                    ? isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                      ? 'bg-gradient-to-br from-amber-500/60 to-amber-600/30 border-2 border-amber-400/80' // Brighter during propagation phase
                      : 'bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-2 border-amber-400/50' // Normal when active
                    : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                }`}
              >
                <div
                  className={`text-xl ${isActive('proposer') ? 'opacity-70' : 'opacity-40'}`}
                  role="img"
                  aria-label="Proposer"
                >
                  👤
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Proposer</div>
                <div className="text-xs text-tertiary">
                  {proposer
                    ? `${proposer.proposerValidatorIndex}${proposerEntity ? ` (${proposerEntity})` : ''}`
                    : 'Waiting for block...'}
                </div>
                {proposer && (
                  <div className="text-xs mt-0.5">
                    {isLocallyBuilt ? (
                      <span className="text-amber-300 font-medium">Locally built</span>
                    ) : (
                      <span className="text-tertiary">External builder</span>
                    )}
                  </div>
                )}
              </div>
              {blockTime !== undefined && (
                <div className="text-xs font-mono text-success">
                  {(blockTime / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>

          {/* Attestation Stage - New Card */}
          <StageCard
            title="Attesters"
            emoji="✓"
            emojiLabel="Attesters"
            isActive={isActive('attester')}
            isInPropagationPhase={isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)}
            subtitle={
              attestationsCount > 0 && totalExpectedAttestations > 0
                ? `${attestationPercentage}% of validators voted`
                : 'Waiting for attestations...'
            }
            progress={attestationPercentage}
          />

          {/* Network Nodes Stage */}
          <div
            className={`p-2 rounded-lg border shadow-sm ${isActive('node') ? 'bg-surface border-subtle' : 'bg-surface/90 border-subtle/50 opacity-80'} transition-opacity duration-300`}
          >
            <div className="flex items-center mb-2">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
                  isActive('node')
                    ? isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                      ? 'bg-gradient-to-br from-purple-500/60 to-purple-500/30 border-2 border-purple-400/80' // Brighter during propagation phase
                      : 'bg-gradient-to-br from-purple-500/30 to-purple-500/10 border-2 border-purple-400/50' // Normal when active
                    : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                }`}
              >
                <div
                  className={`text-xl ${isActive('node') ? 'opacity-70' : 'opacity-40'}`}
                  role="img"
                  aria-label="Network Nodes"
                >
                  🖥️
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Network</div>
                <div className="text-xs text-tertiary">
                  {firstContinentToSeeBlock
                    ? `First in ${firstContinentToSeeBlock}`
                    : 'Waiting for propagation...'}
                </div>
              </div>
            </div>

            {/* Continent progress bars */}
            {isActive('node') && (
              <MobileContinentsPanel
                nodes={nodes}
                nodeBlockSeen={nodeBlockSeen}
                nodeBlockP2P={nodeBlockP2P}
                currentTime={currentTime}
                firstContinentToSeeBlock={firstContinentToSeeBlock}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileBlockProductionView;
