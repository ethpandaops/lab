import React from 'react';
import { Node, Proposer } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import BeaconBlockVisualization from '@/components/beacon/BeaconBlockVisualization';

export interface MobileBlockProductionViewProps {
  bids: Array<{
    relayName: string;
    value: number;
    time: number;
    blockHash?: string;
    builderPubkey?: string;
    isWinning?: boolean;
  }>;
  currentTime: number; // in ms relative to slot start
  relayColors: Record<string, string>;
  winningBid?: {
    blockHash: string;
    value: number;
    relayName: string;
    builderPubkey?: string;
  } | null;
  slot?: number;
  proposer?: Proposer;
  proposerEntity?: string;
  nodes?: Record<string, Node>;
  blockTime?: number;
  nodeBlockSeen?: Record<string, number>;
  nodeBlockP2P?: Record<string, number>;
  block?: {
    execution_payload_transactions_count?: number;
    executionPayloadTransactionsCount?: number;
    blockTotalBytes?: number;
    [key: string]: any;
  };
}

// Helper function to determine if we're in the Propagation phase
const isInPropagationPhase = (
  currentTime: number, 
  nodeBlockSeen: Record<string, number>, 
  nodeBlockP2P: Record<string, number>
): boolean => {
  // Find the earliest time any node saw the block
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
  
  // Default transition time if no real data (around 5 seconds into the slot)
  const defaultTransitionTime = 5000;
  
  // If we have real timing data and the current time has passed that point
  if (earliestNodeTime !== Infinity && currentTime >= earliestNodeTime) {
    return true;
  }
  
  // If no real data or we haven't reached the transition point yet
  return currentTime >= defaultTransitionTime;
};

// Helper function to count unique builder pubkeys from all bids
const countUniqueBuilderPubkeys = (bids: Array<{builderPubkey?: string; [key: string]: any}>): number => {
  const uniqueBuilderPubkeys = new Set();
  bids.forEach(bid => {
    if (bid.builderPubkey) {
      uniqueBuilderPubkeys.add(bid.builderPubkey);
    }
  });
  return uniqueBuilderPubkeys.size;
};

const MobileBlockProductionView: React.FC<MobileBlockProductionViewProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  proposer,
  proposerEntity,
  nodes = {},
  blockTime,
  nodeBlockSeen = {},
  nodeBlockP2P = {},
  block
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
    switch (role) {
      case 'builder':
        // Builders are active from the start
        return currentTime >= 0;
        
      case 'relay':
        // For relay, use the earliest bid time if available
        if (bids.length > 0) {
          const earliestBidTime = Math.min(...bids.map(bid => bid.time));
          return currentTime >= earliestBidTime;
        }
        // Otherwise activate relays shortly after start
        return currentTime >= 1000;
        
      case 'proposer':
        // Proposer activates just before transition to propagation
        return currentTime >= (transitionTime - 500);
        
      case 'node':
        // Nodes activate at the transition point
        return currentTime >= transitionTime;
    }
    
    // Function should never reach here since all cases are handled above
    return false;
  };

  // Group nodes by continent
  const continentData = React.useMemo(() => {
    // Map of continent names to their full names for better display
    const continentFullNames: Record<string, string> = {
      'NA': 'North America',
      'SA': 'South America',
      'EU': 'Europe',
      'AS': 'Asia',
      'AF': 'Africa',
      'OC': 'Oceania',
      'AN': 'Antarctica'
    };
    
    const continentsMap: Record<string, {
      count: number;
      nodesThatHaveSeenBlock: number;
    }> = {};

    // Process node data
    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!node.geo) return;
      
      // Use continent code or continent name
      const continentCode = node.geo.continent || 'Unknown';
      
      // Initialize continent entry if it doesn't exist
      if (!continentsMap[continentCode]) {
        continentsMap[continentCode] = { 
          count: 0,
          nodesThatHaveSeenBlock: 0 
        };
      }
      
      continentsMap[continentCode].count += 1;
      
      // Check if this node has seen the block by current time
      const p2pTime = nodeBlockP2P[nodeId];
      const apiTime = nodeBlockSeen[nodeId];
      const hasSeen = 
        (typeof p2pTime === 'number' && p2pTime <= currentTime) ||
        (typeof apiTime === 'number' && apiTime <= currentTime);
        
      if (hasSeen) {
        continentsMap[continentCode].nodesThatHaveSeenBlock += 1;
      }
    });

    return Object.entries(continentsMap).map(([code, data]) => ({
      name: continentFullNames[code] || code,
      code,
      count: data.count,
      seen: data.nodesThatHaveSeenBlock,
      progress: data.count > 0 ? (data.nodesThatHaveSeenBlock / data.count) * 100 : 0
    })).sort((a, b) => b.seen - a.seen);
  }, [nodes, nodeBlockP2P, nodeBlockSeen, currentTime]);
  
  // Count unique relays
  const activeRelays = React.useMemo(() => {
    const relaysSet = new Set(bids.filter(bid => bid.time <= currentTime).map(bid => bid.relayName));
    return relaysSet.size;
  }, [bids, currentTime]);

  // Calculate which continent saw the block first
  const firstContinentToSeeBlock = React.useMemo(() => {
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
      <div className="bg-surface/30 py-2 px-2 rounded-lg mb-3">
        <div className="border-b border-subtle/30 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-primary">Block Production Timeline</h3>
              <div className="text-xs mt-0.5">
                Phase: <span 
                  className={`font-medium ${isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P) ? 'text-purple-400' : 'text-orange-400'}`}
                >
                  {isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P) ? 'Propagating' : 'Building'}
                </span>
              </div>
            </div>
            <div className="font-mono text-xs text-tertiary/80">{(currentTime / 1000).toFixed(1)}s</div>
          </div>
          
          <div className="relative pt-2 pb-4">
            {/* Two-phase progress bar: Building and Propagating */}
            <div className="h-2 mb-2 flex rounded-lg overflow-hidden border border-subtle relative">
              {/* Calculate transition time */}
              {(() => {
                let transitionTime = 5000; // Default
                let earliestNodeTime = Infinity;
                
                // Look for earliest node time in the data
                Object.values(nodeBlockSeen).forEach(time => {
                  if (typeof time === 'number') {
                    earliestNodeTime = Math.min(earliestNodeTime, time);
                  }
                });
                
                Object.values(nodeBlockP2P).forEach(time => {
                  if (typeof time === 'number') {
                    earliestNodeTime = Math.min(earliestNodeTime, time);
                  }
                });
                
                // Use earliest node time if we have it, otherwise default
                if (earliestNodeTime !== Infinity) {
                  transitionTime = earliestNodeTime;
                } else if (blockTime) {
                  transitionTime = blockTime;
                }
                
                // Calculate the percentage for transition (as portion of the 12s slot)
                const transitionPercent = Math.min(98, Math.max(2, (transitionTime / 12000) * 100));
                const isInPropagation = isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P);
                
                return (
                  <>
                    {/* Building phase - dynamic width based on transition time */}
                    <div 
                      className="border-r border-white/5 transition-colors duration-300" 
                      style={{ 
                        width: `${transitionPercent}%`,
                        backgroundColor: isInPropagation
                          ? 'rgba(249, 115, 22, 0.1)' // faded orange when inactive
                          : 'rgba(249, 115, 22, 0.3)' // brighter orange when active
                      }}
                    />
                    {/* Propagating phase - dynamic width based on transition time */}
                    <div 
                      className="transition-colors duration-300"
                      style={{ 
                        width: `${100 - transitionPercent}%`,
                        backgroundColor: isInPropagation
                          ? 'rgba(168, 85, 247, 0.3)' // brighter purple when active
                          : 'rgba(168, 85, 247, 0.1)' // faded purple when inactive
                      }}
                    />
                    
                    {/* Phase transition marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-[3px] transition-colors duration-300" 
                      style={{
                        left: `${transitionPercent}%`,
                        backgroundColor: isInPropagation
                          ? 'rgba(255, 255, 255, 0.6)' // brighter when we've passed the transition
                          : 'rgba(255, 255, 255, 0.2)' // dimmer before transition
                      }}
                    />
                  </>
                );
              })()}
            </div>
            
            {/* Progress overlay on phases - using linear time progression */}
            <div 
              className="absolute top-2 left-0 h-2 bg-active/20 transition-width duration-100 rounded-l-lg"
              style={{ 
                width: `${(currentTime / 12000) * 100}%`,
                maxWidth: '100%' // Stay within container boundaries
              }}
            />
            
            {/* Time markers */}
            <div className="flex justify-between text-[9px] font-mono text-tertiary/60 px-1">
              <span>0s</span>
              <span>4s</span>
              <span>8s</span>
              <span>12s</span>
            </div>
          </div>
        </div>

        {/* Mobile-optimized cards for each stage */}
        <div className="grid grid-cols-1 gap-2 mt-2">
          {/* Builders Stage */}
          <div className={`p-2 rounded-lg ${isActive('builder') ? 'bg-surface/40' : 'bg-surface/20 opacity-60'} transition-all duration-300`}>
            <div className="flex items-center">
              <div 
                className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
                  isActive('builder')
                    ? !isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                      ? 'bg-gradient-to-br from-orange-500/60 to-orange-500/30 border-2 border-orange-400/80' // Brighter during building phase
                      : 'bg-gradient-to-br from-orange-500/30 to-orange-500/10 border-2 border-orange-400/50' // Normal when active
                    : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                }`}
              >
                <div 
                  className={`text-xl ${isActive('builder') ? 'opacity-70' : 'opacity-40'}`} 
                  role="img" 
                  aria-label="Robot (Builder)"
                >
                  🤖
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Builders</div>
                <div className="text-xs text-tertiary">
                  {bids.length > 0 
                    ? `${countUniqueBuilderPubkeys(bids)} builder${countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''} total` 
                    : 'Waiting for blocks...'}
                </div>
              </div>
              {winningBid && (
                <div className="text-xs font-mono text-success">
                  {winningBid.value.toFixed(2)} ETH
                </div>
              )}
            </div>
          </div>

          {/* Relays Stage */}
          <div className={`p-2 rounded-lg ${isActive('relay') ? 'bg-surface/40' : 'bg-surface/20 opacity-60'} transition-all duration-300`}>
            <div className="flex items-center">
              <div 
                className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
                  isActive('relay')
                    ? !isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                      ? 'bg-gradient-to-br from-green-500/60 to-green-500/30 border-2 border-green-400/80' // Brighter during building phase
                      : 'bg-gradient-to-br from-green-500/30 to-green-500/10 border-2 border-green-400/50' // Normal when active
                    : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                }`}
              >
                <div 
                  className={`text-xl ${isActive('relay') ? 'opacity-70' : 'opacity-40'}`} 
                  role="img" 
                  aria-label="MEV Relay"
                >
                  🔄
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">MEV Relays</div>
                <div className="text-xs text-tertiary">
                  {winningBid 
                    ? `via ${winningBid.relayName}` 
                    : activeRelays > 0 
                      ? `${activeRelays} relay${activeRelays > 1 ? 's' : ''}` 
                      : 'Waiting for relays...'}
                </div>
              </div>
            </div>
          </div>

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
            <div className="space-y-2">
              {continentData.slice(0, 4).map(continent => (
                <div key={continent.code} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div>{continent.name}</div>
                    <div className="font-mono">{continent.seen}/{continent.count}</div>
                  </div>
                  <div className="h-1.5 w-full bg-surface/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500 ease-out"
                      style={{
                        width: `${continent.progress}%`,
                        backgroundColor: {
                          'EU': '#34A853', // Green for Europe
                          'NA': '#4285F4', // Blue for North America
                          'AS': '#FBBC05', // Yellow for Asia
                          'OC': '#EA4335', // Red for Oceania
                          'SA': '#9C27B0', // Purple for South America
                          'AF': '#FF9800', // Orange for Africa
                          'AN': '#00BCD4'  // Cyan for Antarctica
                        }[continent.code] || '#9b59b6'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileBlockProductionView;