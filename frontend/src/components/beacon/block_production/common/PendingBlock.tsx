import React from 'react';

interface PendingBlockProps {
  slot: number;
  epoch: number;
  proposerEntity?: string;
  network?: string;
  currentTime?: number; // Add currentTime to filter bids by time interval
  slotData?: any; // Direct slot data
  previousSlotData?: any; // Previous slot data for negative time bids
}

/**
 * PendingBlock displays a specialized "pending" block for future slots
 * with a simplified display of bid information
 */
const PendingBlock: React.FC<PendingBlockProps> = ({
  slot,
  epoch,
  proposerEntity,
  network,
  currentTime = 0, // Default to 0 if not provided
  slotData,
  previousSlotData,
}) => {
  // Process bid data from the passed slot data with time filtering
  const { bids, highestBid, bidCount } = React.useMemo(() => {
    // Try to find bids from both approaches:
    // 1. Direct bids for this future slot
    // 2. Negative time bids from previous slot

    // Use the directly passed slot data
    const currentSlotData = previousSlotData;

    // Storage for all processed bids
    let processedBids: Array<{
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
        const bidsToProcess = relayFilter ? relayData.bids.filter(relayFilter) : relayData.bids;

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
                builderName:
                  bid.builderName ||
                  (bid.builderPubkey
                    ? sourceData.builderNames?.[bid.builderPubkey] ||
                      bid.builderPubkey.substring(0, 6) + '...'
                    : undefined),
              });
            }
          } catch (error) {
            console.error('Error processing bid:', error);
          }
        });
      });
    };

    // IMPORTANT: For a future slot, we ONLY care about negative time bids from the current slot
    // We should completely ignore any direct bids for the future slot (slotData)

    // Process the current slot data for negative time bids

    // Reset processed bids to be empty - we'll only add negative time bids
    processedBids = [];
    totalBidsCount = 0;

    // Process ONLY negative time bids from current slot
    if (currentSlotData && currentSlotData.relayBids) {
      // Process each relay's bids
      Object.entries(currentSlotData.relayBids).forEach(([relayName, relayData]: [string, any]) => {
        if (!relayData.bids || !Array.isArray(relayData.bids)) return;

        // Filter for all negative time bids (for next slot)
        // Check all possible time field names (JSON can have different casing)
        const negativeBids = relayData.bids.filter(bid => {
          // Account for all possible field names and casing
          const bidTime =
            bid.time ||
            bid.slotTime ||
            bid.slot_time ||
            bid.time_bucket ||
            bid.timeBucket || // some use time buckets
            bid.slot_time;

          return typeof bidTime === 'number' && bidTime < 0;
        });

        // Update total count
        totalBidsCount += negativeBids.length;

        // Process each negative time bid
        negativeBids.forEach(bid => {
          try {
            // Extract value (convert from Wei to ETH if needed)
            let valueInEth = 0;

            if (typeof bid.value === 'string') {
              try {
                valueInEth = Number(BigInt(bid.value)) / 1e18;
              } catch {
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
                time:
                  bid.time ||
                  bid.slotTime ||
                  bid.slot_time ||
                  bid.time_bucket ||
                  bid.timeBucket ||
                  -10000, // Use whichever time field is available
                builderName:
                  bid.builderName ||
                  (bid.builderPubkey
                    ? currentSlotData.builderNames?.[bid.builderPubkey] ||
                      bid.builderPubkey.substring(0, 6) + '...'
                    : undefined),
              });
            }
          } catch (error) {
            console.error('Error processing negative time bid:', error);
          }
        });
      });
    }

    // For a future slot, we want to progressively reveal bids as time advances
    // Early in the slot (e.g., at 1s), we should only see bids in range -12s to -11s
    // Later in the slot (e.g., at 10s), we should see bids in range -12s to -2s

    // Calculate the max time we should show based on current time in slot
    const maxTimeToShow = -12000 + currentTime;

    // Filter bids that fall within our expanding time window
    const timeFilteredBids = processedBids.filter(bid => {
      // Only include bids within our expanding window
      // We always start at -12s, but the max time increases with the current time
      return bid.time >= -12000 && bid.time <= maxTimeToShow;
    });

    // Sort by value (highest first)
    timeFilteredBids.sort((a, b) => b.value - a.value);

    return {
      bids: timeFilteredBids,
      highestBid: timeFilteredBids.length > 0 ? timeFilteredBids[0] : null,
      bidCount: totalBidsCount, // Return total count before time filtering
    };
  }, [slot, network, slotData, previousSlotData, currentTime]); // Add currentTime as a dependency

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(56,189,248,0.2)] w-full h-[140px] transition-all duration-300 relative border border-cyan-600/30">
      {/* Colored indicator at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-cyan-600 to-cyan-700"></div>

      {/* Header section - simplified to only show slot number */}
      <div className="p-4 flex flex-col border-b border-cyan-700/50">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center mr-2 relative overflow-hidden">
              {/* Animated pulse in the background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-cyan-600/5 animate-pulse"></div>

              <svg
                className="w-4 h-4 text-cyan-400 relative z-10"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16 8H8M16 12H8M16 16H8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline flex-wrap gap-2">
                {/* Slot number */}
                <span className="text-lg font-mono font-bold text-text-primary">{slot}</span>
              </div>
            </div>
          </div>

          {/* Pending label moved to right side like block version */}
          <div className="ml-auto bg-cyan-600/20 px-2 py-0.5 rounded text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            PENDING
          </div>
        </div>
      </div>

      {/* Content section - just says "Building" */}
      <div className="p-4 h-[calc(100%-4rem)] flex flex-col justify-center">
        <div className="flex flex-col items-center">
          <div className="text-lg font-medium text-cyan-300">Building...</div>
        </div>
      </div>
    </div>
  );
};

export default PendingBlock;
