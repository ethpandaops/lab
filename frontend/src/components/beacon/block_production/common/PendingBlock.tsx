import React from 'react';

interface PendingBlockProps {
  slot: number;
  epoch: number;
  proposerEntity?: string;
  slotDataStore?: any;
  network?: string;
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
}) => {
  // Process bid data from the slot data store
  const { bids, highestBid } = React.useMemo(() => {
    if (!slotDataStore || !network) {
      return { bids: [], highestBid: null };
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
    }> = [];
    
    // Process function to handle bids from any source
    const processBidsFromSource = (sourceData: any, relayFilter?: (bid: any) => boolean) => {
      if (!sourceData?.relayBids) return;
      
      Object.entries(sourceData.relayBids).forEach(([relayName, relayData]: [string, any]) => {
        if (!relayData.bids || !Array.isArray(relayData.bids)) return;
        
        // Apply filter if provided (for negative time bids)
        const bidsToProcess = relayFilter ? 
          relayData.bids.filter(relayFilter) : 
          relayData.bids;
        
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
            
            // Only add if value is greater than 0
            if (valueInEth > 0) {
              processedBids.push({
                value: valueInEth,
                relayName,
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
    
    // Sort by value (highest first)
    processedBids.sort((a, b) => b.value - a.value);
    
    return { 
      bids: processedBids,
      highestBid: processedBids.length > 0 ? processedBids[0] : null
    };
  }, [slot, network, slotDataStore]);
  
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
                
                {/* Epoch as subtitle */}
                <div className="bg-bg-surface-raised px-2 py-0.5 rounded text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  EPOCH {epoch}
                </div>
                  
                {/* Block Version - Always show "DENEB" but moved to far right */}
                <div className="ml-auto bg-cyber-neon/10 px-2 py-0.5 rounded text-xs font-semibold text-cyber-neon uppercase tracking-wide">
                  DENEB
                </div>
              </div>
            </div>
          </div>
          
          {/* Bid count badge */}
          {bids.length > 0 && (
            <div className="text-xs bg-bg-surface-raised px-2 py-0.5 rounded text-text-secondary font-mono font-medium">
              {bids.length} bid{bids.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      
      {/* Content section */}
      <div className="p-4 h-[calc(100%-4rem)] flex flex-col justify-center">
        {/* Always show "Pending" as the primary label */}
        <div className="flex flex-col items-center">
          <div className="text-md font-medium text-text-primary mb-2">Pending</div>
          
          {/* If we have bids, show the highest bid value */}
          {highestBid ? (
            <>
              <div className="text-sm text-center font-mono font-medium text-success">
                {highestBid.value.toFixed(4)} ETH
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Top bid {bids.length > 1 ? `(${bids.length} bids)` : ''}
              </div>
              {highestBid.builderName && (
                <div className="text-xs text-text-tertiary mt-1">
                  from {highestBid.builderName}
                </div>
              )}
            </>
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