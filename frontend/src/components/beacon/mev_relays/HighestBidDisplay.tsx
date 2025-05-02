import React, { useMemo } from 'react';
import { RelayBid, DeliveredPayload } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
// Removed unused Timestamp import

// --- Placeholder Helper Functions ---

/**
 * Converts a Wei string value to an ETH string representation.
 * Placeholder: Converts Wei string to ETH string using BigInt.
 */
const formatEthValue = (wei: string | undefined): string => {
  if (!wei) return '0.00';
  try {
    const weiBigInt = BigInt(wei);
    // Divide by 10^18 to get ETH
    const ethValue = Number(weiBigInt * 10000n / (10n**18n)) / 10000; // Keep 4 decimal places
    return ethValue.toFixed(4);
  } catch (parseError) {
    console.error("Error formatting ETH value:", wei, parseError);
    return 'N/A';
  }
};

/**
 * Returns a placeholder name for a relay based on its pubkey.
 * Placeholder: Returns a truncated pubkey.
 */
const getRelayName = (pubkey: string | undefined): string => {
  if (!pubkey) return 'Unknown Relay';
  return `Relay (${pubkey.substring(0, 6)}...)`;
};

// --- Component Definition ---

export interface HighestBidDisplayProps {
  bids: RelayBid[] | undefined;
  deliveredPayload: DeliveredPayload | null | undefined;
  currentTime: number; // Simulation time relative to slot start (0-12000ms)
  // slotStartTime is no longer needed as bid.slotTime is relative
}

export const HighestBidDisplay: React.FC<HighestBidDisplayProps> = ({
  bids,
  deliveredPayload,
  currentTime,
  // slotStartTime removed
}) => {
  const highestBidToShow = useMemo(() => {
    if (!bids || bids.length === 0) { // Removed slotStartTime check
      return null;
    }

    let highestBid: RelayBid | null = null;
    let highestValue = BigInt(-1);

    for (const bid of bids) {
      // Use bid.slotTime (relative ms) and bid.value
      // slotTime can be 0, so check for undefined/null if necessary, but proto defaults to 0
      if (bid.value === undefined || bid.slotTime === undefined) continue;

      // Filter bids received up to the current simulation time
      // bid.slotTime is already relative ms
      if (bid.slotTime >= 0 && bid.slotTime <= currentTime) {
        try {
          const bidValue = BigInt(bid.value);
          if (bidValue > highestValue) {
            highestValue = bidValue;
            highestBid = bid;
          }
        } catch (e) {
           console.error("Error processing bid value:", bid, e);
           // Skip this bid if value conversion fails
           continue;
        }
      }
    }

    return highestBid;
  }, [bids, currentTime]); // Removed slotStartTime dependency

  const isWinning = useMemo(() => {
    return !!(
      deliveredPayload &&
      highestBidToShow &&
      highestBidToShow.blockHash === deliveredPayload.blockHash
    );
  }, [highestBidToShow, deliveredPayload]);

  const borderClass = isWinning ? 'border border-success rounded p-2 bg-success/10' : 'p-2'; // Added bg-success/10 for subtle highlight

  return (
    <div className={`highest-bid-display ${borderClass} transition-all duration-300 ease-in-out`}>
      <span className="text-sm text-secondary mr-1">Highest Bid Received:</span>
      {highestBidToShow ? (
        <span className={`font-mono ${isWinning ? 'text-success font-medium' : 'text-primary'}`}>
          {formatEthValue(highestBidToShow.value)} ETH
          <span className="text-xs text-tertiary ml-2">
            (Relay: {getRelayName(highestBidToShow.builderPubkey)}, Received: +{(highestBidToShow.slotTime / 1000).toFixed(3)}s)
          </span>
        </span>
      ) : (
        <span className="text-sm text-muted font-mono">None Received Yet</span>
      )}
    </div>
  );
};

// Export for potential use elsewhere if needed, though default export is common for components
export default HighestBidDisplay;