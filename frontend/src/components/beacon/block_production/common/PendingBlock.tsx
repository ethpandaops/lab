import React from 'react';

interface PendingBlockProps {
  slot: number;
  epoch: number;
  proposerEntity?: string;
  slotDataStore?: any;
  network?: string;
  currentTime?: number; // Add currentTime to filter bids by time interval
}

/**
 * PendingBlock displays a specialized "pending" block for future slots
 * with a simplified display of bid information
 */
const PendingBlock: React.FC<PendingBlockProps> = ({
  slot,
  epoch,
  proposerEntity,
  slotDataStore,
  network,
  currentTime = 0, // Default to 0 if not provided
}) => {
  // Process bid data from the slot data store with time filtering
  const { bids, highestBid, bidCount } = React.useMemo(() => {
    if (!slotDataStore || !network) {
      return { bids: [], highestBid: null, bidCount: 0 };
    }
    
    // Try to find bids from both approaches:
    // 1. Direct bids for this future slot
    // 2. Negative time bids from current slot
    
    // Get data for this slot from the store (direct future slot data)
    const slotData = slotDataStore.getSlotData(network, slot);
    // Get data for current slot (to check for negative time bids)
    const currentSlot = slot - 1;
    const currentSlotData = slotDataStore.getSlotData(network, currentSlot);
    
    // Storage for all processed bids
    const processedBids: Array<{
      value: number;
      relayName: string;
      builderName?: string;
      time: number; // Store time for filtering
    }> = [];
    
    // Keep track of total bids found before filtering by time
    let totalBidsCount = 0;
    
    // Process function to handle bids from any source
    const processBidsFromSource = (sourceData: any, relayFilter?: (bid: any) => boolean) => {
      if (!sourceData?.relayBids) return;
      
      Object.entries(sourceData.relayBids).forEach(([relayName, relayData]: [string, any]) => {
        if (!relayData.bids || !Array.isArray(relayData.bids)) return;
        
        // Apply filter if provided (for negative time bids)
        const bidsToProcess = relayFilter ? 
          relayData.bids.filter(relayFilter) : 
          relayData.bids;
        
        totalBidsCount += bidsToProcess.length;
        
        bidsToProcess.forEach(bid => {
          try {
            // Extract value (convert from Wei to ETH if needed)
            let valueInEth = 0;
            
            if (typeof bid.value === 'string') {
              try {
                // First try to handle as big integer
                valueInEth = Number(BigInt(bid.value)) / 1e18;
              } catch {
                // If not valid bigint, try direct parsing
                valueInEth = parseFloat(bid.value);
              }
            } else if (typeof bid.value === 'number') {
              valueInEth = bid.value;
            }
            
            // Get the time (for future slot from direct bids, or from negative time for current slot)
            let timeValue: number;
            
            if (relayFilter) {
              // For negative time bids from current slot, use the bid time directly
              timeValue = typeof bid.time === 'number' ? bid.time : -1000; // Default to -1s if not provided
            } else {
              // For direct future slot bids, use slotTime if available or default to 0
              timeValue = typeof bid.slotTime === 'number' ? bid.slotTime : 0;
            }
            
            // Only add if value is greater than 0
            if (valueInEth > 0) {
              processedBids.push({
                value: valueInEth,
                relayName,
                time: timeValue,
                builderName: bid.builderName || (bid.builderPubkey ? 
                  (sourceData.builderNames?.[bid.builderPubkey] || 
                   bid.builderPubkey.substring(0, 6) + '...') : undefined)
              });
            }
          } catch (error) {
            console.error("Error processing bid:", error);
          }
        });
      });
    };
    
    // Process direct future slot bids if available
    if (slotData) {
      processBidsFromSource(slotData);
    }
    
    // Process negative time bids from current slot
    if (currentSlotData) {
      // Filter for negative time bids (for next slot)
      const negativeTimeFilter = (bid: any) => 
        typeof bid.time === 'number' && bid.time < 0;
      
      processBidsFromSource(currentSlotData, negativeTimeFilter);
    }
    
    // Calculate the time window based on current time in slot
    // For future slot, we need to map the current time (0-12s) to the equivalent negative time (-12s to 0s)
    // If current time is 2s, we want bids from -12s to -10s for the future slot
    const timeWindow = {
      min: -12000, // Always start at the beginning of a slot (-12s)
      max: -12000 + currentTime // Calculate the end of the window (-12s + current time)
    };
    
    // Filter bids by the time window
    // For negative time bids: include if bid.time is between timeWindow.min and timeWindow.max
    // For direct future bids: map their time to the equivalent negative time window
    const timeFilteredBids = processedBids.filter(bid => {
      if (bid.time < 0) {
        // For negative time bids, check if it's in the correct time window
        return bid.time >= timeWindow.min && bid.time <= timeWindow.max;
      } else {
        // For direct future slot bids, we need to map their time to the equivalent negative time
        // A bid at time 0 in a future slot is equivalent to a negative time bid at -12000ms
        // A bid at time 2000 in a future slot is equivalent to a negative time bid at -10000ms
        const equivalentNegativeTime = -12000 + bid.time;
        return equivalentNegativeTime >= timeWindow.min && equivalentNegativeTime <= timeWindow.max;
      }
    });
    
    // Sort by value (highest first)
    timeFilteredBids.sort((a, b) => b.value - a.value);
    
    return { 
      bids: timeFilteredBids,
      highestBid: timeFilteredBids.length > 0 ? timeFilteredBids[0] : null,
      bidCount: totalBidsCount // Return total count before time filtering
    };
  }, [slot, network, slotDataStore, currentTime]); // Add currentTime as a dependency
  
  return (
    <div className="bg-surface/80 rounded-lg overflow-hidden shadow-md w-full h-[140px] transition-all duration-300 backdrop-blur-sm relative border border-border-accent">
      {/* Colored indicator at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 via-accent-muted/20 to-accent-muted/5"></div>
      
      {/* Header section */}
      <div className="p-4 flex flex-col border-b border-border-subtle">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-bg-surface-raised rounded-lg flex items-center justify-center mr-2 relative overflow-hidden">
              {/* Animated pulse in the background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-muted/20 to-accent/5 animate-pulse"></div>
              
              <svg className="w-4 h-4 text-accent-muted relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 8H8M16 12H8M16 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline flex-wrap gap-2">
                {/* Slot number */}
                <span className="text-lg font-mono font-bold text-text-primary">{slot}</span>
                
                {/* Removed epoch and block version as requested */}
              </div>
            </div>
          </div>
          
          {/* Bid count badge - show total bid count */}
          {bidCount > 0 && (
            <div className="text-xs bg-bg-surface-raised px-2 py-0.5 rounded text-text-secondary font-mono font-medium">
              {bidCount} bid{bidCount !== 1 ? 's' : ''}
              {bidCount > bids.length && (
                <span className="ml-1 text-text-tertiary">({bids.length} visible)</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Content section */}
      <div className="p-4 h-[calc(100%-4rem)] flex flex-col justify-center">
        {/* Always show "Pending" as the primary label */}
        <div className="flex flex-col items-center">
          <div className="text-md font-medium text-text-secondary mb-2">Pending</div>
          
          {/* If we have bids, show the highest bid value */}
          {highestBid ? (
            <>
              <div className="text-sm text-center font-mono font-medium text-success">
                {highestBid.value.toFixed(4)} ETH
              </div>
              
              {/* Show progress of visible bids with correct time window */}
              {bidCount > 0 && (
                <div className="text-xs text-text-secondary mt-1">
                  <span className="whitespace-nowrap">
                    {currentTime > 0 ? 
                      `Time window: -12s to -${Math.round((12000 - currentTime) / 100) / 10}s` : 
                      'Time window: -12s'}
                  </span>
                  {bidCount > bids.length && (
                    <span className="whitespace-nowrap"> • Showing top {bids.length > 0 ? bids.length : 0}/{bidCount}</span>
                  )}
                </div>
              )}
              
              {highestBid.builderName && (
                <div className="text-xs text-text-tertiary mt-1">
                  from {highestBid.builderName}
                </div>
              )}
            </>
          ) : bidCount > 0 ? (
            <div className="text-xs text-text-tertiary mt-1">
              {bidCount} bid{bidCount !== 1 ? 's' : ''} not yet in window
              <div className="mt-1">
                {currentTime > 0 ? 
                  `(Time: -12s to -${Math.round((12000 - currentTime) / 100) / 10}s)` : 
                  '(Time: -12s)'}
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-tertiary mt-1">
              Waiting for bids
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingBlock;