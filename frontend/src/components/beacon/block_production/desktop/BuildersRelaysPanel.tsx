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
  currentPhase = Phase.Building, // Default to building phase if not provided
}) => {
  // Load builder names from the singleton store
  const [builderNamesLoaded, setBuilderNamesLoaded] = React.useState(false);

  useEffect(() => {
    const builderStore = BuilderNamesStore.getInstance();

    // Load the builder names for this network
    builderStore
      .loadBuilderNames(network)
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
        relayName: bid.relayName, // Keep track of which relay it came from
      };
    });

    // Return all unique builder items, sorted with winning bid first then by value
    return builderItems.sort((a, b) => {
      if (a.isWinning && !b.isWinning) return -1;
      if (!a.isWinning && b.isWinning) return 1;
      return b.value - a.value;
    });
  }, [bids, currentTime]);

  // Get unique relay items - filtered by current time
  // For debugging
  useEffect(() => {
    // Always log phase changes to help debug
    console.log(`BuildersRelaysPanel: currentPhase=${currentPhase}, 
                 hasWinningBid=${!!winningBid}, 
                 hasDeliveredRelays=${!!winningBid?.deliveredRelays?.length}`);
    
    if (winningBid?.deliveredRelays?.length > 0) {
      console.log(`BuildersRelaysPanel: deliveredRelays=`, winningBid.deliveredRelays);
    }
  }, [winningBid, currentPhase, currentTime]);

  const relays = useMemo(() => {
    // Filter bids by current time first
    const timeFilteredBids = bids.filter(bid => bid.time <= currentTime);

    // Create a map of unique relays
    const uniqueRelays = new Map();

    // Add delivered relays first (they should always be shown, even if they have no bids)
    // These are the ONLY winning relays - those that actually delivered payloads
    if (winningBid?.deliveredRelays && Array.isArray(winningBid.deliveredRelays)) {
      winningBid.deliveredRelays.forEach(relayName => {
        if (!uniqueRelays.has(relayName)) {
          uniqueRelays.set(relayName, {
            id: `relay-${relayName}`,
            relayName: relayName,
            label: relayName,
            // Delivered relays are ALWAYS winning relays
            isWinning: true,
            // These values will be updated if we find bids from this relay
            value: 0,
            time: 0,
            bidCount: 0,
          });
        }
      });
    }

    // Process bids to get unique relays or update existing ones
    timeFilteredBids.forEach(bid => {
      const relayName = bid.relayName;

      if (!uniqueRelays.has(relayName)) {
        // Create a new relay entry
        uniqueRelays.set(relayName, {
          id: `relay-${relayName}`,
          relayName: relayName,
          label: relayName,
          // A relay is winning ONLY if it's in the delivered_payloads list
          isWinning: winningBid?.deliveredRelays && winningBid.deliveredRelays.includes(relayName),
          value: bid.value,
          time: bid.time,
          bidCount: 1,
        });
      } else {
        // Update existing relay entry
        const relay = uniqueRelays.get(relayName);
        
        // Update bid count
        relay.bidCount = (relay.bidCount || 0) + 1;
        
        // Update with highest value bid
        if (bid.value > relay.value) {
          relay.value = bid.value;
        }
        
        // Update with earliest time
        if (bid.time < relay.time || relay.time === 0) {
          relay.time = bid.time;
        }
      }
    });

    // Convert map to array and sort by different rules depending on the phase
    return Array.from(uniqueRelays.values()).sort((a, b) => {
      // In building phase, sort purely by bid value (highest first)
      if (currentPhase === Phase.Building) {
        return b.value - a.value;
      }
      
      // After building phase:
      // 1. Winning relays first (relays in delivered_payloads)
      // 2. Then sort non-winning relays by their highest bid value
      if (a.isWinning && !b.isWinning) return -1;
      if (!a.isWinning && b.isWinning) return 1;
      
      // For relays in the same winning/non-winning category, sort by value
      return b.value - a.value;
    });
  }, [bids, currentTime, winningBid, currentPhase]);

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Builders list */}
      <div className="rounded-lg overflow-hidden bg-surface/40 border border-subtle/50 shadow-sm flex-grow-[0.65]">
        <div className="p-2 border-b border-subtle/50 bg-surface/60 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent mr-1.5"></div>
            <span className="text-sm font-medium text-primary">Builder bids</span>
          </div>
          <div className="text-xs text-tertiary">
            {builders.length > 0 ? `Top bid per builder` : ''}
          </div>
        </div>
        <div
          className="overflow-y-auto h-[calc(100%-2.5rem)] scrollbar-hide transition-colors duration-500"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {builders.length > 0 ? (
            <div className="space-y-1.5 p-2">
              {/* Show top 7 builders */}
              {builders.slice(0, 7).map(item => {
                // Only show winning styling after the building phase
                // Re-evaluate this each render with the latest phase value
                const isWinningBuilder = !!winningBid?.builderPubkey && item.builderPubkey === winningBid.builderPubkey;
                const showWinningStyle = isWinningBuilder && currentPhase !== Phase.Building;

                return (
                  <div
                    key={item.id}
                    className={`py-2 px-2.5 rounded text-xs transition-all duration-300 ${
                      showWinningStyle
                        ? 'bg-amber-100/10 border-l-2 border-amber-300 hover:bg-amber-100/15'
                        : 'bg-surface/20 hover:bg-surface/30 border-l-2 border-subtle/30'
                    }`}
                    style={{
                      marginBottom: '0.25rem',
                    }}
                  >
                    <div className="flex items-center w-full">
                      <div className="flex items-center w-[70%] min-w-0 overflow-hidden">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${showWinningStyle ? 'bg-amber-400' : 'bg-accent-muted'}`}
                        ></div>
                        <div className="truncate min-w-0 max-w-full overflow-hidden">
                          <span
                            className={`${showWinningStyle ? 'font-medium text-amber-400' : ''} truncate block overflow-hidden`}
                            title={item.label}
                          >
                            {item.label}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono ml-1.5 rounded-md px-1.5 py-0.25 w-[30%] flex-shrink-0 text-right">
                        <span
                          className={`${showWinningStyle ? 'text-amber-400 font-semibold' : 'text-secondary'} text-xs whitespace-nowrap`}
                        >
                          {item.value ? item.value.toFixed(4) : '0.0000'} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Show count of hidden builders if there are more than 7 */}
              {builders.length > 7 && (
                <div className="text-xs text-tertiary text-center pt-1 pb-1">
                  + {builders.length - 7} more builders
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-tertiary p-3">
              {isBuilderActive ? 'No builders yet' : 'Waiting...'}
            </div>
          )}
        </div>
      </div>

      {/* Relays list */}
      <div className="rounded-lg overflow-hidden bg-surface/40 border border-subtle/50 shadow-sm flex-grow-[0.35]">
        <div className="p-2 border-b border-subtle/50 bg-surface/60 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent mr-1.5"></div>
            <span className="text-sm font-medium text-primary">MEV Relays</span>
          </div>
          <div className="text-xs text-tertiary">
            {relays.length > 0 ? `${relays.length} relay${relays.length !== 1 ? 's' : ''}` : ''}
          </div>
        </div>
        <div
          className="overflow-y-auto h-[calc(100%-2.5rem)] scrollbar-hide transition-colors duration-500"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {relays.length > 0 ? (
            <div className="space-y-1.5 p-2">
              {relays.slice(0, 5).map(item => {
                // Only show winning styling after the building phase
                // Re-evaluate this each render with the latest phase value
                const isWinningRelay = !!winningBid?.deliveredRelays?.includes(item.relayName);
                const showWinningStyle = isWinningRelay && currentPhase !== Phase.Building;

                return (
                  <div
                    key={item.id}
                    className={`py-2 px-2.5 rounded text-xs transition-all duration-300 ${
                      showWinningStyle
                        ? 'bg-amber-100/10 border-l-2 border-amber-300 hover:bg-amber-100/15'
                        : 'bg-surface/20 hover:bg-surface/30 border-l-2 border-subtle/30'
                    }`}
                  >
                    <div className="flex items-center w-full">
                      <div className="flex items-center w-[70%] min-w-0 overflow-hidden">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${showWinningStyle ? 'bg-amber-400' : 'bg-accent-muted'}`}
                        ></div>
                        <div className="truncate min-w-0 max-w-full overflow-hidden">
                          <span
                            className={`${showWinningStyle ? 'text-amber-400 font-medium' : 'text-xs'} truncate block overflow-hidden`}
                            title={`${item.label}${showWinningStyle ? ' (delivered payload)' : ''}`}
                          >
                            {item.label}
                            {showWinningStyle && (
                              <span className="ml-1 inline-flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="w-[30%] flex-shrink-0 text-right ml-1.5">
                        <div
                          className={`font-mono ${showWinningStyle ? 'text-amber-400' : 'text-tertiary'} text-[10px] whitespace-nowrap`}
                        >
                          {item.bidCount !== undefined
                            ? `${item.bidCount} bid${item.bidCount !== 1 ? 's' : ''}`
                            : '0 bids'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Show count of hidden relays if there are more than 5 */}
              {relays.length > 5 && (
                <div className="text-xs text-tertiary text-center pt-1 pb-1">
                  + {relays.length - 5} more relays
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-tertiary p-3">
              {isRelayActive ? 'No relays yet' : 'Waiting...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildersRelaysPanel;
