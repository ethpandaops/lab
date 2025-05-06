import React, { useMemo } from 'react';
import { BidData } from '../common/types';
import { truncateMiddle } from '../common/utils';
import FlowStage from './FlowStage';

interface BuildersRelaysPanelProps {
  bids: BidData[];
  currentTime: number;
  relayColors: Record<string, string>;
  winningBid?: {
    blockHash: string;
    value: number;
    relayName: string;
    builderPubkey?: string;
  } | null;
  isBuilderActive: boolean;
  isRelayActive: boolean;
}

const BuildersRelaysPanel: React.FC<BuildersRelaysPanelProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  isBuilderActive,
  isRelayActive
}) => {
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

  return (
    <div className="flex flex-col space-y-3 w-[300px] min-w-[300px]">
      {/* Builders list - fixed height */}
      <div className="bg-surface/40 rounded-xl shadow-lg overflow-hidden p-2 h-[250px]">
        <div className="text-sm font-medium mb-1 text-primary flex items-center">
          <div className="w-2 h-2 rounded-full bg-orange-400 mr-1.5"></div>
          Builders
        </div>
        <div className={`rounded-lg h-[214px] overflow-y-auto transition-colors duration-500 ${isBuilderActive ? 'bg-surface/30' : 'bg-surface/20'}`}>
          {builders.length > 0 ? (
            <div className="space-y-0.25">
              {builders.map(item => (
                <div 
                  key={item.id}
                  className={`py-0.5 px-1 rounded text-xs ${
                    item.isWinning ? 'bg-gold/5' : 'bg-surface/30'
                  } ${isBuilderActive ? 'transition-colors duration-300 hover:bg-opacity-80' : ''}`}
                  style={{
                    backgroundColor: item.isWinning ? 'rgba(255, 215, 0, 0.05)' : 'rgba(230, 126, 34, 0.05)',
                    boxShadow: item.isWinning ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.2)' : 'none',
                    marginBottom: '0.075rem',
                    fontSize: '0.65rem'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div 
                        className={`w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0 ${item.isWinning ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: item.color || '#e67e22' }}
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
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-tertiary p-3">
              {isBuilderActive ? 'No builders yet' : 'Waiting...'}
            </div>
          )}
        </div>
      </div>

      {/* Relays list - fixed height */}
      <div className="bg-surface/40 rounded-xl shadow-lg overflow-hidden p-2 h-[250px]">
        <div className="text-sm font-medium mb-1 text-primary flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-1.5"></div>
          MEV Relays
        </div>
        <div className={`rounded-lg h-[214px] overflow-y-auto transition-colors duration-500 ${isRelayActive ? 'bg-surface/30' : 'bg-surface/20'}`}>
          {relays.length > 0 ? (
            <div className="space-y-0.5">
              {relays.map(item => (
                <div 
                  key={item.id}
                  className={`py-1 px-1.5 rounded text-xs ${
                    item.isWinning ? 'bg-gold/5' : 'bg-surface/30'
                  } ${isRelayActive ? 'transition-colors duration-300 hover:bg-opacity-80' : ''}`}
                  style={{
                    backgroundColor: item.isWinning ? 'rgba(255, 215, 0, 0.05)' : 'rgba(46, 204, 113, 0.05)',
                    boxShadow: item.isWinning ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.2)' : 'none',
                    marginBottom: '0.125rem'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div 
                        className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${item.isWinning ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: item.color || '#2ecc71' }}
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
                </div>
              ))}
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