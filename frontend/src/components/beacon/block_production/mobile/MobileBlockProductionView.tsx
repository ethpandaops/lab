import React, { useMemo } from 'react';
import { BlockProductionBaseProps } from '../common/types';
import BeaconBlockVisualization from '@/components/beacon/BeaconBlockVisualization';
import { isInPropagationPhase } from '../common/PhaseUtils';
import { countUniqueBuilderPubkeys } from '../common/utils';
import MobileTimelineBar from './MobileTimelineBar';
import StageCard from './StageCard';
import MobileContinentsPanel from './MobileContinentsPanel';

interface MobileBlockProductionViewProps extends BlockProductionBaseProps {
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
}

const MobileBlockProductionView: React.FC<MobileBlockProductionViewProps> = ({
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
  // Navigation controls
  slotNumber,
  headLagSlots,
  displaySlotOffset,
  isPlaying,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  togglePlayPause,
  isNextDisabled
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
        return currentTime >= (transitionTime - 500);
        
      case 'node':
        // Nodes activate at the transition point and stay active
        return currentTime >= transitionTime;
    }
    
    // Function should never reach here since all cases are handled above
    return false;
  };

  // Count unique relays
  const activeRelays = useMemo(() => {
    const relaysSet = new Set(bids.filter(bid => bid.time <= currentTime).map(bid => bid.relayName));
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
      'NA': 'North America',
      'SA': 'South America',
      'EU': 'Europe',
      'AS': 'Asia',
      'AF': 'Africa',
      'OC': 'Oceania',
      'AN': 'Antarctica'
    };
    
    return earliestContinent ? continentFullNames[earliestContinent] || earliestContinent : null;
  }, [nodes, nodeBlockSeen, nodeBlockP2P, currentTime]);
  
  return (
    <div className="flex flex-col w-full">
      {/* Timeline with Phase Icons and Key Information */}
      <div className="mb-3">
        <MobileTimelineBar 
          currentTime={currentTime}
          nodeBlockSeen={nodeBlockSeen}
          nodeBlockP2P={nodeBlockP2P}
          blockTime={blockTime}
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

        {/* Mobile-optimized cards for each stage - with border below the hero section */}
        <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-primary/10">
          {/* Builders Stage */}
          <StageCard 
            title="Builders"
            emoji="🤖"
            emojiLabel="Robot (Builder)"
            isActive={isActive('builder')}
            isInPropagationPhase={isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)}
            subtitle={bids.length > 0 
              ? `${countUniqueBuilderPubkeys(bids)} builder${countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''} total` 
              : 'Waiting for blocks...'}
            value={winningBid ? `${winningBid.value.toFixed(2)} ETH` : undefined}
          />

          {/* Relays Stage */}
          <StageCard 
            title="MEV Relays"
            emoji="🔄"
            emojiLabel="MEV Relay"
            isActive={isActive('relay')}
            isInPropagationPhase={isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)}
            subtitle={winningBid 
              ? `via ${winningBid.relayName}` 
              : activeRelays > 0 
                ? `${activeRelays} relay${activeRelays > 1 ? 's' : ''}` 
                : 'Waiting for relays...'}
          />

          {/* Proposer Stage - Beacon Block Card */}
          <div className={`rounded-lg overflow-hidden ${isActive('proposer') ? 'bg-surface/40' : 'bg-surface/20 opacity-60'} transition-all duration-300`}>
            <div className="flex items-center p-2 border-b border-subtle/20">
              <div 
                className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
                  isActive('proposer')
                    ? isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                      ? 'bg-gradient-to-br from-gold/60 to-gold/30 border-2 border-gold/80' // Brighter during propagation phase
                      : 'bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/50' // Normal when active
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
              </div>
              {blockTime !== undefined && (
                <div className="text-xs font-mono text-success">
                  {(blockTime / 1000).toFixed(1)}s
                </div>
              )}
            </div>
            
            {/* Beacon Block visualization */}
            <div className="p-2 h-[180px] overflow-hidden">
              {(() => {
                // Calculate the blob count based on blob gas used
                const blobGasUsed = typeof block?.execution_payload_blob_gas_used !== 'undefined'
                  ? Number(block.execution_payload_blob_gas_used)
                  : typeof block?.executionPayloadBlobGasUsed !== 'undefined'
                    ? Number(block.executionPayloadBlobGasUsed)
                    : 0;
                    
                const blobCount = blobGasUsed > 0 
                  ? Math.ceil(blobGasUsed / 131072) 
                  : 0;
                
                // Get the execution block number in the correct format
                const executionBlockNumber = typeof block?.execution_payload_block_number !== 'undefined'
                  ? Number(block.execution_payload_block_number)
                  : typeof block?.executionPayloadBlockNumber !== 'undefined'
                    ? Number(block.executionPayloadBlockNumber)
                    : undefined;
                    
                // Get the execution transaction count
                const executionTxCount = typeof block?.execution_payload_transactions_count !== 'undefined'
                  ? Number(block.execution_payload_transactions_count)
                  : typeof block?.executionPayloadTransactionsCount !== 'undefined'
                    ? Number(block.executionPayloadTransactionsCount)
                    : undefined;
                    
                // Get block value from winning bid if available
                const blockValue = winningBid?.value;
                
                return (
                  <BeaconBlockVisualization
                    proposer_index={proposer?.proposerValidatorIndex}
                    slot={proposer?.slot}
                    execution_block_number={executionBlockNumber}
                    execution_transaction_count={executionTxCount}
                    block_hash={block?.blockRoot || block?.block_root}
                    execution_block_hash={block?.executionPayloadBlockHash || block?.execution_payload_block_hash}
                    blob_count={blobCount}
                    block_value={blockValue}
                    proposer_entity={proposerEntity}
                    height="100%"
                    width="100%"
                  />
                );
              })()}
            </div>
          </div>

          {/* Network Nodes Stage */}
          <div className={`p-2 rounded-lg ${isActive('node') ? 'bg-surface/40' : 'bg-surface/20 opacity-60'} transition-all duration-300`}>
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
                  {firstContinentToSeeBlock ? `First in ${firstContinentToSeeBlock}` : 'Waiting for propagation...'}
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