import React, { useMemo } from 'react';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Assuming tooltip component exists - Path incorrect/missing
// import { Timestamp } from '@bufbuild/protobuf'; // No longer needed
import { SlimTimings } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'; // Correct path for generated types
import { cn } from '@/lib/utils'; // Assuming cn utility exists

// Helper function (placeholder - replace with actual implementation if needed)
const formatRelativeTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return 'N/A';
  return `+${(ms / 1000).toFixed(2)}s`;
};

// Removed getRelativeMs helper as it's no longer needed


export interface SlotTimingBreakdownProps {
  // bids: RelayBid[] | undefined; // Not passed from parent
  // deliveredPayload: DeliveredPayload | null | undefined; // Not passed from parent
  timings: SlimTimings | undefined;
  currentTime: number; // Relative time in ms (0-12000)
  // slotStartTime: number | undefined; // Not passed from parent
}

export const SlotTimingBreakdown: React.FC<SlotTimingBreakdownProps> = ({
  // bids, // Removed
  // deliveredPayload, // Removed
  timings,
  currentTime,
  // slotStartTime, // Removed
}) => {
  const eventTimes = useMemo(() => {
    // Removed checks/logic for bids, deliveredPayload, slotStartTime

    let firstBlockSeenTimeMs: number | null = null;
    if (timings?.blockSeen && Object.keys(timings.blockSeen).length > 0) {
        // blockSeen values are bigint, convert to number
        const seenTimes = Object.values(timings.blockSeen)
                                .filter((t): t is bigint => t != null) // Filter null/undefined first
                                .map(t => Number(t)); // Convert bigint to number
        if (seenTimes.length > 0) {
            // Clamp seen times relative to the 12s slot
            const clampedSeenTimes = seenTimes.map(t => Math.max(0, Math.min(t, 12000)));
            firstBlockSeenTimeMs = Math.min(...clampedSeenTimes);
        }
    }

    return {
      // firstBidTimeMs: null, // Removed
      // highestBidTimeMs: null, // Removed
      // payloadDeliveredTimeMs: null, // Removed
      firstBlockSeenTimeMs,
    };
  }, [timings]); // Only depend on timings

  const renderMarker = (
    timeMs: number | null,
    label: string,
    colorClass: string,
    icon?: React.ReactNode // Optional icon
  ) => {
    if (timeMs === null || timeMs > currentTime) {
      return null;
    }
    const percentage = (timeMs / 12000) * 100;

    // Return the div directly since Tooltip is commented out
    return (
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-background", // Centered marker
          colorClass
        )}
        style={{ left: `${percentage}%` }}
        aria-label={`${label} at ${formatRelativeTime(timeMs)}`}
        title={`${label}: ${formatRelativeTime(timeMs)}`} // Basic title fallback
      >
        {icon}
      </div>
    );
  };

  // Calculate current time marker position inside the component body
  const currentTimePercentage = Math.min(100, Math.max(0, (currentTime / 12000) * 100));

  return (
    <div className="w-full py-2">
      <div className="relative w-full h-2 bg-surface rounded">
        {/* Progress Fill */}
        <div
            className="absolute top-0 left-0 h-full bg-primary/30 rounded"
            style={{ width: `${currentTimePercentage}%` }}
        />
        {/* Event Markers - Only show block seen */}
        {/* {renderMarker(eventTimes.firstBidTimeMs, 'First Bid Received', 'bg-blue-500')} */}
        {/* {renderMarker(eventTimes.highestBidTimeMs, 'Highest Bid Received', 'bg-blue-700 border-2 border-yellow-400')} */}
        {/* {renderMarker(eventTimes.payloadDeliveredTimeMs, 'Payload Delivered', 'bg-green-500')} */}
        {renderMarker(eventTimes.firstBlockSeenTimeMs, 'First Block Seen', 'bg-teal-500')}

        {/* Optional: Current Time Indicator Line */}
        {/* <div
          className="absolute top-0 bottom-0 w-px bg-red-500"
          style={{ left: `${currentTimePercentage}%` }}
          aria-label={`Current time: ${formatRelativeTime(currentTime)}`}
        /> */}
      </div>
       {/* Optional: Simple Text Fallback/Alternative - Only show block seen */}
       {/* <div className="mt-2 text-xs text-muted"> */}
         {/* {eventTimes.firstBidTimeMs !== null && eventTimes.firstBidTimeMs <= currentTime && <div>First Bid: {formatRelativeTime(eventTimes.firstBidTimeMs)}</div>} */}
         {/* {eventTimes.highestBidTimeMs !== null && eventTimes.highestBidTimeMs <= currentTime && <div>Highest Bid: {formatRelativeTime(eventTimes.highestBidTimeMs)}</div>} */}
         {/* {eventTimes.payloadDeliveredTimeMs !== null && eventTimes.payloadDeliveredTimeMs <= currentTime && <div>Payload Delivered: {formatRelativeTime(eventTimes.payloadDeliveredTimeMs)}</div>} */}
         {/* {eventTimes.firstBlockSeenTimeMs !== null && eventTimes.firstBlockSeenTimeMs <= currentTime && <div>First Block Seen: {formatRelativeTime(eventTimes.firstBlockSeenTimeMs)}</div>} */}
       {/* </div> */}
    </div>
  );
};