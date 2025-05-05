import React, { useMemo } from 'react';
import { Card, CardBody } from '@/components/common/Card';
import { Node, Proposer } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

export interface BlockFlowViewProps {
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
  proposerEntity?: string; // The entity of the proposer (not in Proposer proto)
  nodes?: Record<string, Node>;
  blockTime?: number; // Time when the block was first seen
  
  // Node timing data (when each node saw the block)
  nodeBlockSeen?: Record<string, number>; // API timings - when nodes saw the block via API
  nodeBlockP2P?: Record<string, number>; // P2P timings - when nodes saw the block via P2P
}

// Component to represent a stage in the block flow
const FlowStage: React.FC<{
  title: string;
  color: string;
  isActive: boolean;
  items: Array<{
    id: string;
    label: string;
    color?: string;
    isWinning?: boolean;
    value?: number;
    bidCount?: number;  // Added bid count for relays
    earliestTime?: number;  // First time a node in this continent saw the block
    formattedTime?: string; // Formatted time string
    rank?: number;        // Ranking position (1st, 2nd, 3rd)
    count?: number;       // Number of nodes in the continent
    nodesThatHaveSeenBlock?: number; // Number of nodes that have seen the block
    progress?: number;    // Progress percentage
  }>;
  maxItems?: number;
  showValue?: boolean;
  stageType?: 'builder' | 'relay' | 'proposer' | 'node';
  currentTime: number;    // Current time to determine visibility
}> = ({ title, color, isActive, items, maxItems = 10, showValue = false, stageType, currentTime }) => {
  // For relays, sort alphabetically (with winning bid first)
  // For other stages, sort by value
  const displayItems = useMemo(() => {
    if (items.length <= maxItems && stageType !== 'builder') return items;
    
    if (stageType === 'builder') {
      // For builders, show top 10 builders by value (winning bid first)
      return [...items]
        .sort((a, b) => {
          if (a.isWinning && !b.isWinning) return -1;
          if (!a.isWinning && b.isWinning) return 1;
          return b.value - a.value;
        })
        .slice(0, 10); // Only show top 10 builders
    } else if (stageType === 'relay') {
      // For relays, show all relays, sorted alphabetically with winning bid first
      return [...items]
        .sort((a, b) => {
          if (a.isWinning && !b.isWinning) return -1;
          if (!a.isWinning && b.isWinning) return 1;
          return a.label.localeCompare(b.label);
        });
    } else if (stageType === 'node') {
      // For nodes, prioritize sorting by timing data (who saw the block first)
      if (items.some(item => item.earliestTime !== undefined && item.earliestTime <= currentTime)) {
        // If we have timing data for nodes that have seen the block, sort by that
        return [...items]
          .sort((a, b) => {
            const aTime = a.earliestTime !== undefined && a.earliestTime <= currentTime ? a.earliestTime : Infinity;
            const bTime = b.earliestTime !== undefined && b.earliestTime <= currentTime ? b.earliestTime : Infinity;
            
            // If both have no timing or timing hasn't reached current time, sort by count
            if (aTime === Infinity && bTime === Infinity) {
              return (b.count || 0) - (a.count || 0);
            }
            
            // Otherwise sort by earliest time
            return aTime - bTime;
          })
          .slice(0, maxItems);
      } else {
        // If no timing data yet, sort by count (highest first)
        return [...items]
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, maxItems);
      }
    } else {
      // For other stages, sort by value (highest first)
      return [...items]
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, maxItems);
    }
  }, [items, maxItems, stageType]);

  return (
    <div 
      className={`w-full h-full flex flex-col transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-40'}`}
    >
{/* Title row removed */}
      
      <div className={`flex-1 ${stageType === 'node' ? 'p-1' : 'p-1.5'} rounded-lg overflow-y-auto transition-colors duration-500 ${isActive ? 'bg-surface/30' : 'bg-surface/20'}`}>
        {displayItems.length > 0 ? (
          <div className={`${
            stageType === 'node' 
              ? 'space-y-1' 
              : stageType === 'relay'
                ? 'space-y-0.5'
                : stageType === 'builder'
                  ? 'space-y-0.25' // Even smaller spacing for builders
                  : 'space-y-1.5'
          }`}>
            {displayItems.map(item => (
              <div 
                key={item.id}
                className={`${
                  stageType === 'node' 
                    ? 'p-1.5' 
                    : stageType === 'relay'
                      ? 'py-1 px-1.5'
                      : stageType === 'builder'
                        ? 'py-0.5 px-1' // Even smaller padding for builders
                        : 'p-2'
                } rounded text-xs ${
                  stageType === 'node'
                    ? `transition-opacity duration-500 ${isActive ? '' : 'opacity-70'}`
                    : item.isWinning 
                      ? 'bg-gold/5' 
                      : 'bg-surface/30'
                } ${isActive ? 'transition-colors duration-300 hover:bg-opacity-80' : ''}`}
                style={{
                  ...(stageType === 'node' && {
                    // Slightly deeper background color for top 3 continents, without borders
                    backgroundColor: item.rank > 0 && item.rank <= 3 
                      ? `${item.color}20` // More visible background for top 3
                      : `${item.color}10`, // Light background for others
                    boxShadow: 'none', // No borders
                    marginBottom: '0.25rem' // Reduce spacing between items
                  }),
                  ...(stageType === 'builder' && {
                    backgroundColor: item.isWinning ? 'rgba(255, 215, 0, 0.05)' : 'rgba(230, 126, 34, 0.05)',
                    boxShadow: item.isWinning ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.2)' : 'none',
                    marginBottom: '0.075rem', // Minimal spacing for builders to fit more
                    fontSize: '0.65rem' // Slightly smaller text to fit more builders
                  }),
                  ...(stageType === 'relay' && {
                    backgroundColor: item.isWinning ? 'rgba(255, 215, 0, 0.05)' : 'rgba(46, 204, 113, 0.05)',
                    boxShadow: item.isWinning ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.2)' : 'none',
                    marginBottom: '0.125rem' // Even smaller spacing for relays
                  })
                }}
              >
                {/* Item header - conditionally display based on type */}
                {stageType === 'builder' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div 
                        className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${item.isWinning ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: item.color || color }}
                      ></div>
                      <div className="text-xs font-mono truncate flex-1">
                        {item.label}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono ml-1 text-tertiary">
                      <span className={`${item.isWinning ? 'text-gold/90 font-medium' : ''}`}>
                        {item.value ? item.value.toFixed(4) : '0.0000'} ETH
                      </span>
                    </div>
                  </div>
                ) : stageType === 'relay' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div 
                        className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${item.isWinning ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: item.color || color }}
                      ></div>
                      <div className="text-xs truncate flex-1">
                        {item.label}
                      </div>
                    </div>
                    <div className="flex items-center ml-1.5">
                      <div className="text-[10px] font-mono text-tertiary">
                        {item.bidCount !== undefined ? `${item.bidCount} bid${item.bidCount !== 1 ? 's' : ''}` : '0 bids'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {stageType !== 'node' && (
                        <div 
                          className={`w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0 ${item.isWinning ? 'animate-pulse' : ''}`}
                          style={{ backgroundColor: item.color || color }}
                        ></div>
                      )}
                      {stageType === 'node' ? (
                        <div className="font-medium">
                          {item.fullName || item.label}
                        </div>
                      ) : (
                        <div className="font-medium truncate">
                          {item.label}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Relay items display all content in header */}
                
                {/* Builder items display content in the header */}
                
                {/* For node items - super compact display with medal rankings */}
                {stageType === 'node' && (
                  <div className="mt-0.5">
                    {/* Single-line compact display with fixed height */}
                    <div className="flex justify-between items-center mb-0.5 h-5">
                      {/* Medal + Time */}
                      <div className="flex items-center gap-1 min-w-0">
                        {/* Medal for top 3 - always reserve space */}
                        <span className="text-[11px] mr-0.5 w-4 flex justify-center">
                          {item.rank > 0 && item.rank <= 3 && item.earliestTime && item.earliestTime <= currentTime ? 
                            (item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉') : ''}
                        </span>
                        
                        {/* Time pill with fixed height/width */}
                        <span className="font-mono text-[10px] font-medium bg-gray-800/40 px-1 py-0.5 rounded min-w-[40px] text-center">
                          {item.earliestTime && item.earliestTime <= currentTime && item.formattedTime
                            ? item.formattedTime
                            : "Waiting..."}
                        </span>
                      </div>
                      
                      {/* Node count - fixed width */}
                      <div className="text-[10px] font-medium min-w-[60px] text-right">
                        Seen: 
                        <span className={`font-mono ml-1 ${
                          !isActive 
                            ? 'text-tertiary/50' 
                            : item.nodesThatHaveSeenBlock > 0 
                              ? 'text-white' 
                              : ''
                        }`}>
                          {item.nodesThatHaveSeenBlock}/{item.count}
                        </span>
                      </div>
                    </div>
                    
                    {/* Thin progress bar - fixed height */}
                    <div className="h-[2px] w-full bg-gray-200/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-width duration-700 ease-out"
                        style={{ 
                          width: `${item.progress || 0}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Show value for other stages */}
                {stageType !== 'relay' && stageType !== 'builder' && stageType !== 'node' && showValue && item.value !== undefined && (
                  <div className="mt-1.5 text-[11px] font-mono text-tertiary">
                    Value: {item.value.toFixed(6)} ETH
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-tertiary">
            {isActive ? 'No items yet' : 'Waiting...'}
          </div>
        )}
      </div>
    </div>
  );
};

// Component to show connection flow between stages with animated dots
const ConnectionLine: React.FC<{
  isActive: boolean;
  isWinning?: boolean;
}> = ({ isActive, isWinning = false }) => {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Minimal connection line */}
      <div className="h-4 w-20 relative">
        <div 
          className={`absolute top-1/2 -translate-y-1/2 h-[1px] w-full transition-colors duration-300 ${
            !isActive 
              ? 'bg-tertiary/20 opacity-50' 
              : isWinning 
                ? 'bg-gold/70' 
                : 'bg-tertiary/30'
          }`}
        />
        
        {/* Clean simple flow indicator - just two dots */}
        {isActive && (
          <>
            <div 
              className={`absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 ${
                isWinning ? 'bg-gold/90' : 'bg-tertiary/70'
              }`}
              style={{
                left: '30%',
                animationName: 'pulseOpacity',
                animationDuration: '2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out'
              }}
            />
            <div 
              className={`absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 ${
                isWinning ? 'bg-gold/90' : 'bg-tertiary/70'
              }`}
              style={{
                left: '70%',
                animationName: 'pulseOpacity',
                animationDuration: '2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
                animationDelay: '1s'
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to count unique builder pubkeys in a list of builder items
const countUniqueBuilders = (builders: Array<{builderPubkey: string; [key: string]: any}>): number => {
  const uniqueBuilderPubkeys = new Set();
  builders.forEach(builder => {
    if (builder.builderPubkey) {
      uniqueBuilderPubkeys.add(builder.builderPubkey);
    }
  });
  return uniqueBuilderPubkeys.size;
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

// Helper function to determine if we're in the Propagation phase
// This happens when the first node has seen the block
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

export const SankeyNetworkView: React.FC<BlockFlowViewProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  proposer,
  proposerEntity,
  nodes = {},
  blockTime,
  nodeBlockSeen = {},  // API timings
  nodeBlockP2P = {}    // P2P timings
}) => {
  // Truncate string with ellipsis in the middle
  const truncateMiddle = (str: string, startChars = 6, endChars = 4) => {
    if (!str) return 'N/A';
    if (str.length <= startChars + endChars) return str;
    return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
  };

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

  // Get builder bids - filtered by current time and deduplicated by builder pubkey
  const builders = useMemo(() => {
    // Filter bids by current time first
    const timeFilteredBids = bids.filter(bid => bid.time <= currentTime);
    
    // First, group bids by builder pubkey to understand the data structure
    const builderBidsByPubkey = new Map<string, any[]>();
    
    timeFilteredBids.forEach(bid => {
      const builderKey = bid.builderPubkey || 'unknown';
      if (!builderBidsByPubkey.has(builderKey)) {
        builderBidsByPubkey.set(builderKey, []);
      }
      builderBidsByPubkey.get(builderKey)?.push(bid);
    });
    
    // For each builder, get their highest-value bid
    const uniqueBuilderBids: any[] = [];
    
    builderBidsByPubkey.forEach((builderBids, builderPubkey) => {
      // First check if this builder has a winning bid
      const winningBid = builderBids.find(bid => bid.isWinning);
      
      if (winningBid) {
        // If there's a winning bid, use that one
        uniqueBuilderBids.push(winningBid);
      } else {
        // Otherwise use the highest-value bid from this builder
        const highestBid = [...builderBids].sort((a, b) => b.value - a.value)[0];
        uniqueBuilderBids.push(highestBid);
      }
    });
    
    // Create individual bid items from the deduplicated bids
    const builderItems = uniqueBuilderBids.map(bid => ({
      id: `${bid.builderPubkey || 'unknown'}-${bid.time}-${bid.value}`,
      blockHash: bid.blockHash,
      builderPubkey: bid.builderPubkey || 'unknown',
      label: truncateMiddle(bid.builderPubkey || 'unknown', 8, 6),
      color: bid.isWinning ? '#FFD700' : '#e67e22', // Gold for winning builder
      value: bid.value,
      time: bid.time,
      isWinning: bid.isWinning,
      relayName: bid.relayName // Keep track of which relay it came from
    }));
    
    // Return all unique builder items, sorted with winning bid first then by value
    // We don't slice here - we want the full list for accurate counting,
    // but the FlowStage component will only display the top 10
    return builderItems
      .sort((a, b) => {
        if (a.isWinning && !b.isWinning) return -1;
        if (!a.isWinning && b.isWinning) return 1;
        return b.value - a.value;
      });
  }, [bids, currentTime]);

  // Get unique relay items - filtered by current time
  const relays = useMemo(() => {
    // Filter bids by current time first
    const timeFilteredBids = bids.filter(bid => bid.time <= currentTime);
    
    // Create a map of unique relays
    const uniqueRelays = new Map();
    
    // Process bids to get unique relays
    timeFilteredBids.forEach(bid => {
      const relayName = bid.relayName;
      
      // If relay not yet in map, or this is a winning bid, update the entry
      if (!uniqueRelays.has(relayName) || bid.isWinning) {
        uniqueRelays.set(relayName, {
          id: `relay-${relayName}`,
          relayName: relayName,
          label: relayName,
          // Gold color for relay that provided the winning bid
          color: winningBid?.relayName === relayName ? '#FFD700' : (relayColors[relayName] || '#3498db'),
          // Use highest value bid from this relay
          value: uniqueRelays.has(relayName) 
            ? Math.max(uniqueRelays.get(relayName).value, bid.value)
            : bid.value,
          time: uniqueRelays.has(relayName)
            ? Math.min(uniqueRelays.get(relayName).time, bid.time) // Use earliest bid time
            : bid.time,
          // Mark relay as winning if it provided the block
          isWinning: winningBid?.relayName === relayName,
          bidCount: (uniqueRelays.get(relayName)?.bidCount || 0) + 1
        });
      } else {
        // Update bid count for existing relay
        const relay = uniqueRelays.get(relayName);
        relay.bidCount = (relay.bidCount || 0) + 1;
        // Update with highest value bid
        if (bid.value > relay.value) {
          relay.value = bid.value;
        }
        // Update with earliest time
        if (bid.time < relay.time) {
          relay.time = bid.time;
        }
      }
    });
    
    // Convert map to array and sort (winning relay first, then alphabetically)
    return Array.from(uniqueRelays.values())
      .sort((a, b) => {
        if (a.isWinning && !b.isWinning) return -1;
        if (!a.isWinning && b.isWinning) return 1;
        return a.relayName.localeCompare(b.relayName);
      });
  }, [bids, relayColors, currentTime, winningBid]);

  // Proposer data
  const proposerData = useMemo(() => {
    if (!proposer) return [];
    
    return [{
      id: String(proposer.proposerValidatorIndex),
      label: `Proposer ${proposer.proposerValidatorIndex}${proposerEntity ? ` (${proposerEntity})` : ''}`,
      color: '#FFD700', // Always use gold for the proposer
      isWinning: true,
      value: winningBid?.value
    }];
  }, [proposer, proposerEntity, winningBid]);

  // Group nodes by continent for display with additional timing data
  const continents = useMemo(() => {
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
    
    // Map of continent colors for distinct visualization
    const continentColors: Record<string, string> = {
      'NA': '#4285F4', // Blue for North America
      'EU': '#34A853', // Green for Europe
      'AS': '#FBBC05', // Yellow for Asia
      'OC': '#EA4335', // Red for Oceania
      'SA': '#9C27B0', // Purple for South America
      'AF': '#FF9800', // Orange for Africa
      'AN': '#00BCD4'  // Cyan for Antarctica
    };

    const continentsMap: Record<string, {
      count: number;
      nodes: Node[];
      // Track timing data for each node
      nodeTimings: Array<{
        nodeId: string;
        p2pTime?: number; // Time when node saw block via p2p
        apiTime?: number; // Time when node saw block via api
        firstSeenTime?: number; // The earlier of p2p and api time
      }>;
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
          nodes: [],
          nodeTimings: []
        };
      }
      
      continentsMap[continentCode].count += 1;
      continentsMap[continentCode].nodes.push(node);
      
      // Extract block timing data for this node
      const nodeTiming = {
        nodeId,
        p2pTime: nodeBlockP2P[nodeId], // Get P2P timing if available
        apiTime: nodeBlockSeen[nodeId], // Get API timing if available
        firstSeenTime: undefined
      };
      
      // Calculate first seen time (earliest of P2P and API)
      if (nodeTiming.p2pTime !== undefined || nodeTiming.apiTime !== undefined) {
        const p2pTime = nodeTiming.p2pTime !== undefined ? nodeTiming.p2pTime : Infinity;
        const apiTime = nodeTiming.apiTime !== undefined ? nodeTiming.apiTime : Infinity;
        nodeTiming.firstSeenTime = Math.min(p2pTime, apiTime);
        
        // If we only have infinity values, set to undefined
        if (nodeTiming.firstSeenTime === Infinity) {
          nodeTiming.firstSeenTime = undefined;
        }
      }
      
      // Add to node timings list
      continentsMap[continentCode].nodeTimings.push(nodeTiming);
    });

    // Generate simulated node timing data for testing if no real data
    // and we have a blockTime defined (this ensures the progress bars will work)
    if (blockTime !== undefined) {
      const hasAnyRealNodeData = Object.keys(nodeBlockSeen).length > 0 || Object.keys(nodeBlockP2P).length > 0;
      
      // Only simulate if we don't have any real node data
      if (!hasAnyRealNodeData) {
        Object.values(continentsMap).forEach(continentData => {
          // Only generate simulation if we don't have real timing data
          const hasRealTiming = continentData.nodeTimings.some(timing => timing.firstSeenTime !== undefined);
          
          if (!hasRealTiming) {
            // Randomize the node order for more realistic simulation
            // This prevents all nodes in one continent from seeing the block in the same pattern
            const shuffledTimings = [...continentData.nodeTimings].sort(() => Math.random() - 0.5);
            
            // Simulate more realistic network propagation based on geographic distribution
            // Different continents have slightly different propagation patterns
            const continentLatency = (() => {
              // Base latency multipliers for different continents
              // This creates variation in how quickly blocks propagate in different regions
              const latencyMap: Record<string, number> = {
                'NA': 0.8,  // North America - typically faster infrastructure
                'EU': 0.85, // Europe - also fast infrastructure
                'AS': 1.1,  // Asia - varies by region, slightly slower on average
                'OC': 1.2,  // Oceania - geographical distance adds latency
                'SA': 1.3,  // South America - more latency
                'AF': 1.4,  // Africa - typically higher latency
                'AN': 2.0   // Antarctica - highest latency
              };
              
              // Get latency multiplier for this continent, default to 1.0
              return latencyMap[continentCode] || 1.0;
            })();
            
            // Shuffle and assign timings in a more exponential pattern
            shuffledTimings.forEach((timing, index) => {
              // Calculate percentage into the list (0-1)
              const percentIntoList = index / Math.max(1, continentData.count - 1);
              
              // Base delay calculation - uses a more natural curve
              // This creates a non-linear speed of propagation that's more realistic
              const baseDelay = Math.pow(percentIntoList * 2.5, 2) * 6000;
              
              // Add randomness and apply continent-specific latency adjustments
              const randomFactor = (0.7 + (Math.random() * 0.6)); // 0.7-1.3 random multiplier
              const delay = baseDelay * randomFactor * continentLatency;
              
              // Ensure minimum time is at least 0.5s after block time
              // and add additional small random variance (0-300ms)
              timing.firstSeenTime = blockTime + Math.max(delay, 500) + (Math.random() * 300);
            });
          }
        });
      }
    }

    // Calculate continent progress data
    const processedContinents = Object.entries(continentsMap).map(([continentCode, data]) => {
      // Get full continent name if available
      const fullName = continentFullNames[continentCode] || continentCode;
      
      // Sort nodes by earliest seen time
      const sortedNodes = [...data.nodeTimings].sort((a, b) => {
        const aTime = a.firstSeenTime !== undefined ? a.firstSeenTime : Infinity;
        const bTime = b.firstSeenTime !== undefined ? b.firstSeenTime : Infinity;
        return aTime - bTime;
      });
      
      // Calculate how many nodes have seen the block by current time
      const nodesThatHaveSeenBlock = data.nodeTimings.filter(timing => {
        const seenTime = timing.firstSeenTime;
        return seenTime !== undefined && seenTime <= currentTime;
      }).length;
      
      // Calculate progress percentage
      const progress = data.count > 0 ? (nodesThatHaveSeenBlock / data.count) * 100 : 0;
      
      // Find earliest and latest node timing for this continent
      const timings = data.nodeTimings
        .map(t => t.firstSeenTime)
        .filter((t): t is number => t !== undefined)
        .sort((a, b) => a - b);
        
      const earliestTime = timings.length > 0 ? timings[0] : undefined;
      const latestTime = timings.length > 0 ? timings[timings.length - 1] : undefined;
      
      // Format the earliest time as a readable time if it exists
      const formattedTime = earliestTime !== undefined 
        ? `${(earliestTime / 1000).toFixed(2)}s`
        : undefined;
      
      return {
        id: continentCode,
        continentCode, // Keep the code for color lookup
        fullName,      // Store the full name
        label: fullName, 
        color: continentColors[continentCode] || '#9b59b6', // Use continent-specific color
        count: data.count,
        nodesThatHaveSeenBlock,
        progress,       // Store progress percentage
        earliestTime,   // First node to see the block (numeric)
        formattedTime,  // Formatted earliest time
        latestTime,     // Last node to see the block
        isWinning: progress > 0, // Mark as winning if at least one node has seen the block
        rank: 0,        // Will be set based on sorting
      };
    });
    
    // Sort continents by earliestTime (who saw the block first)
    const sortedContinents = [...processedContinents].sort((a, b) => {
      // If either doesn't have timing data, push to the end
      if (a.earliestTime === undefined && b.earliestTime === undefined) return 0;
      if (a.earliestTime === undefined) return 1;
      if (b.earliestTime === undefined) return -1;
      
      // Otherwise sort by earliest time
      return a.earliestTime - b.earliestTime;
    });
    
    // Assign medal rankings to the top 3
    sortedContinents.forEach((continent, index) => {
      if (continent.earliestTime !== undefined) {
        continent.rank = index + 1; // 1-based ranking
      }
    });
    
    return sortedContinents;
  }, [nodes, currentTime, blockTime, nodeBlockSeen, nodeBlockP2P]);

  return (
    <div className="mb-4">
      <div className="bg-surface/30 py-3 px-3 rounded-lg">
        {/* Hero Timeline with Phase Icons and Key Information */}
        <div className="border-b border-subtle/30">
          <div className="flex justify-between items-center pt-3 px-4">
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
          
          <div className="relative px-4 pt-2 pb-6">
            {/* Two-phase progress bar: Building and Propagating */}
            <div className="h-2 mb-3 flex rounded-lg overflow-hidden border border-subtle relative">
              {/* Dynamic phase bars based on transition time */}
              {(() => {
                // Calculate transition time 
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
              className="absolute top-2 left-4 h-2 bg-active/20 transition-width duration-100 rounded-l-lg"
              style={{ 
                width: `${(currentTime / 12000) * 100}%`,
                maxWidth: 'calc(100% - 32px)' // Stay within container boundaries
              }}
            />
            
            {/* Time markers showing evenly spaced time intervals */}
            <div className="flex mb-6 px-1 relative">
              {/* 0s marker */}
              <div className="absolute left-0 flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">0s</span>
              </div>
              
              {/* 2s marker */}
              <div className="absolute left-[16.7%] flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">2s</span>
              </div>
              
              {/* 4s marker */}
              <div className="absolute left-[33.3%] flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">4s</span>
              </div>
              
              {/* 6s marker */}
              <div className="absolute left-[50%] flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">6s</span>
              </div>
              
              {/* 8s marker */}
              <div className="absolute left-[66.7%] flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">8s</span>
              </div>
              
              {/* 10s marker */}
              <div className="absolute left-[83.3%] flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">10s</span>
              </div>
              
              {/* 12s marker */}
              <div className="absolute right-0 flex flex-col items-center">
                <div className="w-px h-1 bg-white/10 mb-0.5" />
                <span className="font-mono text-[9px] text-tertiary/60">12s</span>
              </div>
              
              {/* Transition time marker removed */}
            </div>
          
            {/* Removed timeline connecting line */}
            
            {/* Timeline nodes with custom connectors */}
            <div className="flex justify-between items-center px-6 relative z-10">
              {/* Builders Phase */}
              <div className={`flex flex-col items-center text-center ${!isActive('builder') ? 'opacity-60' : ''}`}>
                <div 
                  className={`w-16 h-16 flex items-center justify-center rounded-full mb-2 shadow-md transition-colors duration-500 ${
                    isActive('builder')
                      ? !isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                        ? 'bg-gradient-to-br from-orange-500/60 to-orange-500/30 border-2 border-orange-400/80' // Brighter during building phase
                        : 'bg-gradient-to-br from-orange-500/30 to-orange-500/10 border-2 border-orange-400/50' // Normal when active
                      : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                  }`}
                >
                  <div 
                    className={`text-3xl ${isActive('builder') ? 'animate-pulse' : 'opacity-40'}`} 
                    role="img" 
                    aria-label="Robot (Builder)"
                  >
                    🤖
                  </div>
                </div>
                <div className="font-medium text-sm">Builders</div>
                <div className="text-xs text-tertiary mt-0.5 max-w-[110px] h-8">
                  {bids.length > 0 
                    ? `${countUniqueBuilderPubkeys(bids)} builder${countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''} total` 
                    : 'Waiting for blocks...'}
                </div>
              </div>

              {/* Connection between Builders and Relays */}
              <div className="flex-shrink-0 flex items-center justify-center relative">
                <div className={`h-0.5 w-[40px] ${isActive('relay') ? isActive('builder') ? 'bg-active' : 'bg-active/40' : 'bg-tertiary/20'} transition-colors duration-500`}></div>
              </div>

              {/* Relays Phase */}
              <div className={`flex flex-col items-center text-center ${!isActive('relay') ? 'opacity-60' : ''}`}>
                <div 
                  className={`w-16 h-16 flex items-center justify-center rounded-full mb-2 shadow-md transition-colors duration-500 ${
                    isActive('relay')
                      ? !isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                        ? 'bg-gradient-to-br from-green-500/60 to-green-500/30 border-2 border-green-400/80' // Brighter during building phase
                        : 'bg-gradient-to-br from-green-500/30 to-green-500/10 border-2 border-green-400/50' // Normal when active
                      : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                  }`}
                >
                  <div 
                    className={`text-3xl ${isActive('relay') ? 'animate-pulse' : 'opacity-40'}`} 
                    role="img" 
                    aria-label="MEV Relay"
                  >
                    🔄
                  </div>
                </div>
                <div className="font-medium text-sm">MEV Relays</div>
                <div className="text-xs text-tertiary mt-0.5 max-w-[110px] h-8">
                  {winningBid 
                    ? `via ${winningBid.relayName}` 
                    : relays.length > 0 
                      ? `${relays.length} relay${relays.length > 1 ? 's' : ''}` 
                      : 'Waiting for relays...'}
                </div>
              </div>

              {/* Connection between Relays and Proposer */}
              <div className="flex-shrink-0 flex items-center justify-center relative">
                <div className={`h-0.5 w-[40px] ${isActive('proposer') ? isActive('relay') ? 'bg-active' : 'bg-active/40' : 'bg-tertiary/20'} transition-colors duration-500`}></div>
              </div>

              {/* Proposer Phase */}
              <div className={`flex flex-col items-center text-center ${!isActive('proposer') ? 'opacity-60' : ''}`}>
                <div 
                  className={`w-16 h-16 flex items-center justify-center rounded-full mb-2 shadow-md transition-colors duration-500 ${
                    isActive('proposer')
                      ? isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                        ? 'bg-gradient-to-br from-gold/60 to-gold/30 border-2 border-gold/80' // Brighter during propagation phase
                        : 'bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/50' // Normal when active
                      : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                  }`}
                >
                  <div 
                    className={`text-3xl ${isActive('proposer') ? 'animate-pulse' : 'opacity-40'}`} 
                    role="img" 
                    aria-label="Proposer"
                  >
                    👤
                  </div>
                </div>
                <div className="font-medium text-sm">Proposer</div>
                <div className="text-xs text-tertiary mt-0.5 max-w-[110px] h-8">
                  {proposer
                    ? `${proposer.proposerValidatorIndex}${proposerEntity ? ` (${proposerEntity})` : ''}`
                    : 'Waiting for block...'}
                </div>
                {blockTime !== undefined && (
                  <div className="text-xs font-mono text-success absolute bottom-0 whitespace-nowrap">
                    {(blockTime / 1000).toFixed(1)}s
                  </div>
                )}
              </div>

              {/* Connection between Proposer and Nodes */}
              <div className="flex-shrink-0 flex items-center justify-center relative">
                <div className={`h-0.5 w-[40px] ${isActive('node') ? isActive('proposer') ? 'bg-active' : 'bg-active/40' : 'bg-tertiary/20'} transition-colors duration-500`}></div>
              </div>

              {/* Network Nodes Phase */}
              <div className={`flex flex-col items-center text-center ${!isActive('node') ? 'opacity-60' : ''}`}>
                <div 
                  className={`w-16 h-16 flex items-center justify-center rounded-full mb-2 shadow-md transition-colors duration-500 ${
                    isActive('node')
                      ? isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P)
                        ? 'bg-gradient-to-br from-purple-500/60 to-purple-500/30 border-2 border-purple-400/80' // Brighter during propagation phase
                        : 'bg-gradient-to-br from-purple-500/30 to-purple-500/10 border-2 border-purple-400/50' // Normal when active
                      : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
                  }`}
                >
                  <div 
                    className={`text-3xl ${isActive('node') ? 'animate-pulse' : 'opacity-40'}`} 
                    role="img" 
                    aria-label="Network Nodes"
                  >
                    🖥️
                  </div>
                </div>
                <div className="font-medium text-sm">Network</div>
                <div className="text-xs text-tertiary mt-0.5 max-w-[110px] h-8">
                  {continents.length > 0 && continents.some(c => c.progress > 0)
                    ? continents.sort((a, b) => {
                        if (a.earliestTime === undefined) return 1;
                        if (b.earliestTime === undefined) return -1;
                        return a.earliestTime - b.earliestTime;
                      })[0].fullName 
                      ? `First in ${continents.sort((a, b) => {
                          if (a.earliestTime === undefined) return 1;
                          if (b.earliestTime === undefined) return -1;
                          return a.earliestTime - b.earliestTime;
                        })[0].fullName}`
                      : `${continents.filter(c => c.progress > 0).length}/${continents.length} continents`
                    : 'Waiting for propagation...'}
                </div>
              </div>
            </div>
            
{/* Removed redundant Building/Propagating labels */}
            
            {/* Enhanced current progress indicator - using linear time progression */}
            <div 
              className="absolute top-2 left-4 h-2 bg-active/80 transition-width duration-100"
              style={{ 
                left: `calc(4px + ${(currentTime / 12000) * 100}%)`,
                width: '3px',
                boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.5)'
              }}
            >
              <div 
                className="absolute top-0 w-4 h-4 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{
                  boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)'
                }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Main content area with precisely aligned columns */}
        <div className="grid grid-cols-7 h-[420px] gap-0">
          {/* Column 1: Builders */}
          <div className="col-span-1">
            <FlowStage
              title="Block Builders"
              color="#e67e22"
              isActive={isActive('builder')}
              items={builders}
              stageType="builder"
              currentTime={currentTime}
            />
          </div>
          
          {/* Column 2: Connection Line */}
          <div className="flex justify-center items-center">
            <ConnectionLine 
              isActive={isActive('relay')} 
              isWinning={winningBid !== null && isActive('relay')}
            />
          </div>
          
          {/* Column 3: Relays */}
          <div className="col-span-1">
            <FlowStage
              title="MEV Relays"
              color="#2ecc71"
              isActive={isActive('relay')}
              items={relays}
              stageType="relay"
              currentTime={currentTime}
            />
          </div>
          
          {/* Column 4: Connection Line */}
          <div className="flex justify-center items-center">
            <ConnectionLine 
              isActive={isActive('proposer')} 
              isWinning={winningBid !== null && isActive('proposer')}
            />
          </div>
          
          {/* Column 5: Proposer */}
          <div className="col-span-1">
            <div className={`flex-1 flex items-center justify-center rounded-lg ${isActive('proposer') ? 'opacity-100 bg-surface/30' : 'opacity-40 bg-surface/20'} transition-opacity transition-colors duration-700`}>
              {proposer && (
                <div className={`
                  relative w-44 h-32 
                  bg-gradient-to-br from-gold/30 to-gold/5
                  rounded-md
                  flex flex-col items-center justify-center
                  transition-opacity duration-500
                `}
                style={{ boxShadow: isActive('proposer') ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.5)' : 'none' }}
                >
                  <div className="text-xs font-medium text-primary mb-1">Proposer {proposer.proposerValidatorIndex}</div>
                  {proposerEntity && <div className="text-xs text-secondary mb-2">{proposerEntity}</div>}
                  
                  {winningBid && (
                    <div className="text-xs text-secondary">
                      Block Value: <span className="font-mono text-success/90">{winningBid.value.toFixed(4)} ETH</span>
                    </div>
                  )}
                  
                  {/* Ping animation when block is first seen */}
                  {isActive('proposer') && (
                    <>
                      <div className="absolute inset-0 border border-gold/50 rounded-md animate-ping opacity-30"></div>
                      <div className="absolute inset-0 border border-gold/30 rounded-md animate-pulse"></div>
                    </>
                  )}
                </div>
              )}
              
              {!proposer && (
                <div className="h-full flex items-center justify-center text-xs text-tertiary">
                  {isActive('proposer') ? 'No proposer data' : 'Waiting...'}
                </div>
              )}
            </div>
          </div>
          
          {/* Column 6: Connection Line */}
          <div className="flex justify-center items-center">
            <ConnectionLine 
              isActive={isActive('node')} 
              isWinning={proposerData.length > 0 && isActive('node')}
            />
          </div>
          
          {/* Column 7: Network Nodes */}
          <div className="col-span-1">
            <FlowStage
              title="Network Nodes"
              color="#9b59b6"
              isActive={isActive('node')}
              items={continents}
              stageType="node"
              currentTime={currentTime}
              maxItems={20} /* Ensure we show all possible continents */
            />
          </div>
        </div>

        <div className="text-xs text-tertiary mt-2 px-1">
          <p>This visualization demonstrates the complete Ethereum block production process: Builders proposing blocks, Relays forwarding bids, Proposers selecting blocks, and Network nodes receiving blocks.</p>
        </div>
      </div>
    </div>
  );
};

export default SankeyNetworkView; 