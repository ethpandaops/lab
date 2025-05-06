import React, { useMemo, useEffect } from 'react';
import { BidData, Phase } from '../common/types';
import { truncateMiddle } from '../common/utils';
import FlowStage from './FlowStage';
import BuilderNamesStore from '../../../../stores/BuilderNamesStore';

interface BuildersRelaysPanelProps {
  bids: BidData[];
  currentTime: number;
  relayColors: Record<string, string>;
  winningBid?: {
    blockHash: string;
    value: number;
    relayName: string;
    builderPubkey?: string;
    deliveredRelays?: string[]; // Add support for multiple delivered relays
  } | null;
  isBuilderActive: boolean;
  isRelayActive: boolean;
  network: string; // Add network prop to fetch appropriate builder names
  currentPhase?: Phase; // Add current phase to determine when to show winning bid/relay
}

const BuildersRelaysPanel: React.FC<BuildersRelaysPanelProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  isBuilderActive,
  isRelayActive,
  network,
  currentPhase = Phase.Building // Default to building phase if not provided
}) => {
  // Load builder names from the singleton store
  const [builderNamesLoaded, setBuilderNamesLoaded] = React.useState(false);
  
  useEffect(() => {
    const builderStore = BuilderNamesStore.getInstance();
    
    // Load the builder names for this network
    builderStore.loadBuilderNames(network)
      .then(() => {
        setBuilderNamesLoaded(true);
      })
      .catch(error => {
        console.error('Failed to load builder names:', error);
        setBuilderNamesLoaded(true); // Still mark as loaded to prevent infinite loading state
      });
  }, [network]);
  // Get builder bids - filtered by current time and deduplicated by builder label/pubkey
  const builders = useMemo(() => {
    // Filter bids by current time first
    const timeFilteredBids = bids.filter(bid => bid.time <= currentTime);
    
    // Get builder store to resolve names
    const builderStore = BuilderNamesStore.getInstance();
    
    // First, group bids by builder label (or pubkey if no label)
    const builderBidsByLabel = new Map<string, any[]>();
    
    timeFilteredBids.forEach(bid => {
      const builderPubkey = bid.builderPubkey || 'unknown';
      // Try to get builder name, fall back to pubkey if not available
      const builderName = builderStore.getBuilderName(builderPubkey);
      // Use the builder name as the key if available, otherwise use pubkey
      const groupKey = builderName || builderPubkey;
      
      if (!builderBidsByLabel.has(groupKey)) {
        builderBidsByLabel.set(groupKey, []);
      }
      builderBidsByLabel.get(groupKey)?.push(bid);
    });
    
    // For each builder group, get their highest-value bid
    const uniqueBuilderBids: any[] = [];
    
    builderBidsByLabel.forEach((builderBids, builderLabel) => {
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
    const builderItems = uniqueBuilderBids.map(bid => {
      // Get builder name from the singleton store
      const builderName = builderStore.getBuilderName(bid.builderPubkey || '');
      
      const displayName = builderName || truncateMiddle(bid.builderPubkey || 'unknown', 8, 6);
      
      return {
        id: `${bid.builderPubkey || 'unknown'}-${bid.time}-${bid.value}`,
        blockHash: bid.blockHash,
        builderPubkey: bid.builderPubkey || 'unknown',
        label: displayName,
        fullName: builderName,
        pubkeyLabel: truncateMiddle(bid.builderPubkey || 'unknown', 8, 6),
        value: bid.value,
        time: bid.time,
        isWinning: bid.isWinning,
        relayName: bid.relayName // Keep track of which relay it came from
      };
    });
    
    // Return all unique builder items, sorted with winning bid first then by value
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
          // Using semantic colors instead of hardcoded ones - success color for winning relay
          // Mark relay as winning if it's in the deliveredPayloads list or it matches the winning bid relay
          isWinning: (winningBid?.deliveredRelays && winningBid.deliveredRelays.includes(relayName)) || winningBid?.relayName === relayName,
          // Use highest value bid from this relay
          value: uniqueRelays.has(relayName) 
            ? Math.max(uniqueRelays.get(relayName).value, bid.value)
            : bid.value,
          time: uniqueRelays.has(relayName)
            ? Math.min(uniqueRelays.get(relayName).time, bid.time) // Use earliest bid time
            : bid.time,
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
  }, [bids, currentTime, winningBid]);

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Builders list - fixed height (250px) - increased from 200px */}
      <div className="rounded-lg overflow-hidden bg-bg-surface border border-border-subtle h-[250px]">
        <div className="text-sm font-medium p-2 bg-surface/80 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent mr-1.5"></div>
            Builder bids
          </div>
          <div className="text-xs text-text-tertiary">
            {builders.length > 0 ? `Top bid per builder` : ''}
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-2.5rem)] scrollbar-hide transition-colors duration-500"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {builders.length > 0 ? (
            <div className="space-y-0.5 p-2">
              {/* Show top 10 builders (increased from 8) */}
              {builders.slice(0, 10).map(item => {
                // Only show winning styling if we're not in building phase
                const showWinningStyle = item.isWinning && currentPhase !== Phase.Building;
                
                return (
                  <div 
                    key={item.id}
                    className={`py-1 px-2 rounded text-xs transition-all duration-300 ${
                      showWinningStyle 
                        ? 'bg-amber-100/20 border border-amber-300/20 shadow-sm' 
                        : 'bg-bg-surface'
                    }`}
                    style={{
                      marginBottom: '0.25rem',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${showWinningStyle ? 'bg-amber-400' : 'bg-accent-muted'}`}
                        ></div>
                        <div className="truncate flex-1">
                          <span className={`${showWinningStyle ? 'font-medium text-amber-400' : ''}`}>
                            {item.label}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono ml-1.5 rounded-md px-1.5 py-0.25">
                        <span className={`${showWinningStyle ? 'text-amber-400 font-semibold' : 'text-text-secondary'} text-xs`}>
                          {item.value ? item.value.toFixed(4) : '0.0000'} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Show count of hidden builders if there are more than 10 */}
              {builders.length > 10 && (
                <div className="text-xs text-text-tertiary text-center pt-1 pb-1">
                  + {builders.length - 10} more builders
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-text-tertiary p-3">
              {isBuilderActive ? 'No builders yet' : 'Waiting...'}
            </div>
          )}
        </div>
      </div>

      {/* Relays list - fixed height (220px) - increased from 180px */}
      <div className="rounded-lg overflow-hidden bg-bg-surface border border-border-subtle h-[220px]">
        <div className="text-sm font-medium p-2 bg-surface/80 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent mr-1.5"></div>
            MEV Relays
          </div>
          <div className="text-xs text-text-tertiary">
            {relays.length > 0 ? `${relays.length} relay${relays.length !== 1 ? 's' : ''}` : ''}
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-2.5rem)] scrollbar-hide transition-colors duration-500"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {relays.length > 0 ? (
            <div className="space-y-0.5 p-2">
              {relays.map(item => {
                // Only show winning styling if we're not in building phase
                const showWinningStyle = item.isWinning && currentPhase !== Phase.Building;
                
                return (
                  <div 
                    key={item.id}
                    className={`py-1 px-2 rounded text-xs transition-all duration-300 ${
                      showWinningStyle 
                        ? 'bg-amber-100/20 border border-amber-300/20 shadow-sm' 
                        : 'bg-bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${showWinningStyle ? 'bg-amber-400' : 'bg-accent-muted'}`}
                        ></div>
                        <div className={`truncate flex-1 ${showWinningStyle ? 'text-amber-400 font-medium' : 'text-xs'}`}>
                          {item.label}
                        </div>
                      </div>
                      <div className="flex items-center ml-1.5">
                        <div className={`font-mono ${showWinningStyle ? 'text-amber-400' : 'text-text-tertiary'} text-[10px]`}>
                          {item.bidCount !== undefined ? `${item.bidCount} bid${item.bidCount !== 1 ? 's' : ''}` : '0 bids'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-text-tertiary p-3">
              {isRelayActive ? 'No relays yet' : 'Waiting...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildersRelaysPanel;