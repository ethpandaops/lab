import React, { useMemo } from 'react';

// --- Placeholder Types and Functions (Replace with actual imports) ---

// Actual Timestamp type might differ, adjust as needed
interface Timestamp {
  seconds: number;
  nanos: number;
}

// Define RelayBid and DeliveredPayload based on expected structure
// Replace with actual imports from API types if available
interface RelayBid {
  receivedAt?: Timestamp | number; // Allow number for relative time if used
  value?: bigint | string;
  builderPubkey?: string;
  blockHash?: string;
  // Add other relevant fields if needed
}

interface DeliveredPayload {
  blockHash?: string;
  // Add other relevant fields if needed
}

const formatEthValue = (value: bigint | string | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  try {
    const wei = BigInt(value);
    const ether = wei / BigInt(10**18);
    const remainder = wei % BigInt(10**18);
    const decimals = remainder.toString().padStart(18, '0').substring(0, 4);
    return `${ether}.${decimals}`;
  } catch (e) {
    console.error("Error formatting ETH value:", value, e);
    return 'Invalid Value';
  }
};

const getRelayName = (pubkey: string | undefined): string => {
  if (!pubkey) return 'Unknown Relay';
  // Simple placeholder - replace with actual lookup logic
  return `Relay ${pubkey.substring(0, 8)}...`;
};

// Helper to convert Timestamp object or number to seconds relative to slot start
const getBidReceivedTimeRelative = (
    receivedAt: Timestamp | number | undefined,
    slotStartTime: number | undefined
): number | null => {
    if (receivedAt === undefined || slotStartTime === undefined) return null;

    if (typeof receivedAt === 'number') {
        // Assume it's already relative if it's just a number
        return receivedAt;
    } else if (receivedAt && typeof receivedAt.seconds === 'number') {
        // Calculate relative time from absolute timestamp
        const receivedSeconds = receivedAt.seconds + (receivedAt.nanos || 0) / 1e9;
        return receivedSeconds - slotStartTime;
    }
    return null;
};

const formatRelativeTime = (relativeSeconds: number | null): string => {
    if (relativeSeconds === null) return 'N/A';
    return `+${relativeSeconds.toFixed(3)}`;
};

// --- Component Implementation ---

export interface BidListComponentProps {
  bids: RelayBid[] | undefined;
  deliveredPayload: DeliveredPayload | null | undefined;
  currentTime: number; // Time in seconds relative to slot start
  slotStartTime: number | undefined; // Absolute slot start time in seconds since epoch
}

interface ProcessedBid extends RelayBid {
  isWinning: boolean;
  receivedTimeRelative: number | null;
}

export const BidListComponent: React.FC<BidListComponentProps> = ({
  bids,
  deliveredPayload,
  currentTime,
  slotStartTime,
}) => {
  const processedBids = useMemo((): ProcessedBid[] => {
    if (!bids || slotStartTime === undefined) {
      return [];
    }

    const winningBlockHash = deliveredPayload?.blockHash;

    const filteredAndProcessed = bids
      .map(bid => {
        const receivedTimeRelative = getBidReceivedTimeRelative(bid.receivedAt, slotStartTime);
        return {
          ...bid,
          receivedTimeRelative,
          isWinning: !!winningBlockHash && bid.blockHash === winningBlockHash,
        };
      })
      .filter(bid => bid.receivedTimeRelative !== null && bid.receivedTimeRelative <= currentTime);

    // Sort by received time ascending
    filteredAndProcessed.sort((a, b) => {
        if (a.receivedTimeRelative === null || b.receivedTimeRelative === null) return 0;
        return a.receivedTimeRelative - b.receivedTimeRelative;
    });
    // Optional: Secondary sort by value descending if times are equal?
    // filteredAndProcessed.sort((a, b) => {
    //   if (a.receivedTimeRelative !== b.receivedTimeRelative) {
    //       return (a.receivedTimeRelative ?? 0) - (b.receivedTimeRelative ?? 0);
    //   }
    //   // Sort descending by value if times are equal
    //   const valA = BigInt(a.value ?? 0);
    //   const valB = BigInt(b.value ?? 0);
    //   if (valA < valB) return 1;
    //   if (valA > valB) return -1;
    //   return 0;
    // });


    return filteredAndProcessed;
  }, [bids, currentTime, slotStartTime, deliveredPayload]);

  return (
    <div className="mt-4">
      <h3 className="text-lg font-sans font-semibold text-primary mb-2">Received Bids</h3>
      {processedBids.length === 0 ? (
        <p className="text-sm font-mono text-muted">No bids received yet for the current time.</p>
      ) : (
        <ul className="space-y-2">
          {processedBids.map((bid, index) => (
            <li
              key={`${bid.builderPubkey}-${bid.blockHash}-${index}`} // Simple key, might need refinement
              className={`p-2 border rounded-md text-sm font-mono ${
                bid.isWinning
                  ? 'bg-success/10 border-success/50'
                  : 'bg-surface/50 border-subtle'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">
                  {formatEthValue(bid.value)} ETH
                </span>
                <span className="text-tertiary">
                  {formatRelativeTime(bid.receivedTimeRelative)}s
                </span>
              </div>
              <div className="text-xs text-secondary mt-1">
                {getRelayName(bid.builderPubkey)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BidListComponent;