import React, { useMemo } from 'react';
import { Phase, BlockProductionBaseProps } from '../common/types';
import BlockchainVisualization from '@/components/beacon/BlockchainVisualization';
import { getCurrentPhase } from '../common/PhaseUtils';
import PhaseTimeline from '../common/PhaseTimeline';
import PhaseIcons from '../common/PhaseIcons';
import BuildersRelaysPanel from './BuildersRelaysPanel';
import ContinentsList from './ContinentsList';

// Define the flow animation styles
const flowAnimations = `
  @keyframes flowRight {
    0% { transform: translateX(0); opacity: 0.5; }
    50% { transform: translateX(100%); opacity: 1; }
    50.1% { transform: translateX(-100%); opacity: 1; }
    100% { transform: translateX(0); opacity: 0.5; }
  }
  
  @keyframes pulseOpacity {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
`;

interface DesktopBlockProductionViewProps extends BlockProductionBaseProps {
  slotData?: any;
  valueRange?: {
    min: number;
    max: number;
  };
  timeRange?: {
    min: number;
    max: number;
    ticks: number[];
  };
  // Optional callback to notify parent component when the phase changes
  onPhaseChange?: (phase: Phase) => void;

  // Navigation controls for merged timeline
  slotNumber: number | null;
  headLagSlots: number;
  displaySlotOffset: number;
  isPlaying: boolean;
  goToPreviousSlot: () => void;
  goToNextSlot: () => void;
  resetToCurrentSlot: () => void;
  togglePlayPause: () => void;
  isNextDisabled: boolean;
  network: string; // Add network prop for builder names lookup
  isLocallyBuilt?: boolean;
}

const DesktopBlockProductionView: React.FC<DesktopBlockProductionViewProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  slot,
  proposer,
  proposerEntity,
  nodes = {},
  blockTime,
  nodeBlockSeen = {},
  nodeBlockP2P = {},
  block,
  slotData,
  valueRange,
  timeRange,
  onPhaseChange,
  // Navigation controls
  slotNumber,
  headLagSlots,
  displaySlotOffset,
  isPlaying,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  togglePlayPause,
  isNextDisabled,
  network,
  isLocallyBuilt = false,
}) => {
  // Get active status based on role and phase
  const isActive = (role: 'builder' | 'relay' | 'proposer' | 'node') => {
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

    // For each role, determine if it's active based on the phase
    // Modified to keep entities active once they've been activated during the slot
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
        // Nodes activate at the transition point and stays active
        return currentTime >= transitionTime;
    }

    // Function should never reach here since all cases are handled above
    return false;
  };

  // No debug needed
  
  // Get the current phase
  const currentPhase = useMemo(() => {
    return getCurrentPhase(currentTime, nodeBlockSeen || {}, nodeBlockP2P || {}, blockTime);
  }, [currentTime, nodeBlockSeen, nodeBlockP2P, blockTime]);

  // Calculate which continent saw the block first
  const firstContinentToSeeBlock = useMemo(() => {
    // Map of continent codes to full names
    const continentNames: Record<string, string> = {
      NA: 'North America',
      SA: 'South America',
      EU: 'Europe',
      AS: 'Asia',
      AF: 'Africa',
      OC: 'Oceania',
      AN: 'Antarctica',
    };

    if (!Object.keys(nodeBlockSeen).length && !Object.keys(nodeBlockP2P).length) {
      return null;
    }

    // Combine API and P2P block seen timings
    const nodeBlockSeen1 = Object.fromEntries(
      Object.entries(nodeBlockSeen).map(([node, time]) => [
        node,
        typeof time === 'bigint' ? Number(time) : Number(time),
      ]),
    );

    const nodeBlockP2P1 = Object.fromEntries(
      Object.entries(nodeBlockP2P).map(([node, time]) => [
        node,
        typeof time === 'bigint' ? Number(time) : Number(time),
      ]),
    );

    // Get earliest node timings grouped by continent
    const continentTimings: Record<string, number> = {};
    const nodeContinent: Record<string, string> = {};

    // Map nodes to continents
    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (node.geo?.continent) {
        nodeContinent[nodeId] = node.geo.continent;
      }
    });

    // Process API timings
    Object.entries(nodeBlockSeen1).forEach(([nodeId, time]) => {
      const continent = nodeContinent[nodeId];
      if (continent && typeof time === 'number' && time <= currentTime) {
        if (!continentTimings[continent] || time < continentTimings[continent]) {
          continentTimings[continent] = time;
        }
      }
    });

    // Process P2P timings
    Object.entries(nodeBlockP2P1).forEach(([nodeId, time]) => {
      const continent = nodeContinent[nodeId];
      if (continent && typeof time === 'number' && time <= currentTime) {
        if (!continentTimings[continent] || time < continentTimings[continent]) {
          continentTimings[continent] = time;
        }
      }
    });

    // Find earliest continent
    let earliestContinent = null;
    let earliestTime = Infinity;

    Object.entries(continentTimings).forEach(([continent, time]) => {
      if (time < earliestTime) {
        earliestTime = time;
        earliestContinent = continent;
      }
    });

    // Return full continent name if available
    return earliestContinent ? continentNames[earliestContinent] || earliestContinent : null;
  }, [nodeBlockSeen, nodeBlockP2P, nodes, currentTime]);

  // Determine if we should show the timeline based on whether we're on the live page
  // If goToPreviousSlot is not provided, we're likely on the specific slot page
  const showTimeline =
    typeof goToPreviousSlot === 'function' &&
    typeof goToNextSlot === 'function' &&
    typeof resetToCurrentSlot === 'function';

  return (
    <div className="h-full flex flex-col">
      <style jsx>{flowAnimations}</style>

      {/* Main card for timeline and phase icons */}
      <div className="bg-surface rounded-lg overflow-hidden shadow-sm mb-3">
        {/* Timeline Header - only shown on live page */}
        {showTimeline && (
          <div className="px-4 py-3">
            <PhaseTimeline
              currentTime={currentTime}
              nodeBlockSeen={nodeBlockSeen}
              nodeBlockP2P={nodeBlockP2P}
              blockTime={blockTime}
              slotData={slotData}
              onPhaseChange={onPhaseChange}
              // Navigation controls
              slotNumber={slotNumber}
              headLagSlots={headLagSlots}
              displaySlotOffset={displaySlotOffset}
              isPlaying={isPlaying}
              isMobile={false} // Desktop view is never mobile
              goToPreviousSlot={goToPreviousSlot}
              goToNextSlot={goToNextSlot}
              resetToCurrentSlot={resetToCurrentSlot}
              togglePlayPause={togglePlayPause}
              isNextDisabled={isNextDisabled}
            />
          </div>
        )}

        {/* Phase Icons Section */}
        <div className="px-4 py-8 bg-surface/50">
          <PhaseIcons
            currentTime={currentTime}
            nodeBlockSeen={nodeBlockSeen}
            nodeBlockP2P={nodeBlockP2P}
            blockTime={blockTime}
            bids={bids}
            winningBid={winningBid}
            proposer={proposer}
            nodes={nodes}
            slotData={slotData}
            firstContinentToSeeBlock={firstContinentToSeeBlock}
            isLocallyBuilt={isLocallyBuilt}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden px-4 pb-4">
        {/* Left panel - Builders and Relays */}
        <div className="w-1/5 overflow-hidden">
          <BuildersRelaysPanel
            bids={bids}
            currentTime={currentTime}
            relayColors={relayColors}
            winningBid={winningBid}
            isBuilderActive={isActive('builder')}
            isRelayActive={isActive('relay')}
            network={network}
            currentPhase={currentPhase}
          />
        </div>

        {/* Center panel - Blockchain Visualization */}
        <div className="flex-1 overflow-hidden flex flex-col bg-surface/40 border border-subtle/50 rounded-lg shadow-sm p-3">
          <BlockchainVisualization
            currentSlot={slotNumber}
            network={network}
            currentTime={currentTime}
            nodeBlockSeen={nodeBlockSeen}
            nodeBlockP2P={nodeBlockP2P}
            blockTime={blockTime}
            height="100%"
            width="100%"
            slotData={slotData}
          />
        </div>

        {/* Right panel - Continents */}
        <div className="w-1/5 overflow-hidden">
          <ContinentsList
            nodes={nodes}
            nodeBlockSeen={nodeBlockSeen}
            nodeBlockP2P={nodeBlockP2P}
            currentTime={currentTime}
            isActive={isActive('node')}
          />
        </div>
      </div>
    </div>
  );
};

export default DesktopBlockProductionView;
