import React, { useMemo } from 'react';
// Removed unused imports: DeliveredPayload, RelayBids, DeliveredPayloads, SlimTimings
import { BeaconSlotData, RelayBid } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
// Removed formatGwei import, will format inline
import { Box, Layers3, PackageCheck } from 'lucide-react'; // Example icons
import clsx from 'clsx';
import { protoInt64 } from '@bufbuild/protobuf';

// Define the structure for events processed for the timeline
interface TimelineEvent {
  type: 'bid' | 'payload' | 'block';
  time: number; // Time in milliseconds relative to the start of the *current* slot (can be negative or > 12000)
  value?: bigint | number | string; // e.g., bid value, payload value, block node ID
  label: string; // e.g., Relay Name, Builder Pubkey, Node ID
  slotOffset: number; // -1 for previous, 0 for current, 1 for next
}

// Define the component props
interface MultiSlotEventTimelineProps {
  currentSlotData: BeaconSlotData | null | undefined;
  nextSlotData: BeaconSlotData | null | undefined;
  previousSlotData?: BeaconSlotData | null | undefined; // Optional previous slot
  currentTime: number; // Simulation time in ms relative to the start of the *current* slot (0-12000)
  currentSlotNumber: number | null;
}

// Helper to format Gwei (simplified)
const formatGweiSimple = (value: bigint | number | string | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    const wei = typeof value === 'string' ? BigInt(value) : protoInt64.parse(value);
    const gwei = Number(wei) / 1e9;
    if (gwei < 0.001) return '< 0.001';
    return gwei.toFixed(3);
}

// Helper to safely get relay/builder name from map key or bid
const getEntityName = (relayName: string | undefined, bid?: RelayBid): string => {
    if (bid?.builderPubkey) {
        // Prefer builder pubkey if available on the bid itself
        return `Builder ${bid.builderPubkey.substring(0, 8)}...`;
    }
    if (relayName) {
        // Fallback to relay name from the map key
        return relayName.charAt(0).toUpperCase() + relayName.slice(1); // Simple capitalization
    }
    return 'Unknown';
};

// Helper to get node name from block arrival map key
const getNodeNameFromMapKey = (key: string): string => {
    // Assuming key format is "username/node-name" or just "node-name"
    const parts = key.split('/');
    return parts[parts.length - 1] || key;
}

const SLOT_DURATION_MS = 12000;

export const MultiSlotEventTimeline: React.FC<MultiSlotEventTimelineProps> = ({
  currentSlotData,
  nextSlotData,
  previousSlotData,
  currentTime,
  currentSlotNumber,
}) => {
  const processedEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    const processSlot = (slotData: BeaconSlotData | null | undefined, slotOffset: number) => {
      if (!slotData) return;

      const baseTimeOffset = slotOffset * SLOT_DURATION_MS;

      // Process Bids from the map
      if (slotData.relayBids) {
        Object.entries(slotData.relayBids).forEach(([relayName, relayBidsContainer]) => {
            // Removed explicit : RelayBid type annotation to satisfy linter
            relayBidsContainer.bids.forEach((bid) => {
                // Use bid.slotTime which is already relative ms
                const relativeTime = bid.slotTime;
                events.push({
                    type: 'bid',
                    time: relativeTime + baseTimeOffset,
                    value: bid.value, // Value is string representation of uint256
                    label: getEntityName(relayName, bid), // Pass relayName and bid
                    slotOffset: slotOffset,
                });
            });
        });
      }


      // Process Delivered Payloads from the map
      if (slotData.deliveredPayloads) {
         Object.entries(slotData.deliveredPayloads).forEach(([relayName, deliveredPayloadsContainer]) => {
            // Iterate through payloads, but the payload object itself isn't used for the event data here
            deliveredPayloadsContainer.payloads.forEach(() => {
                // DeliveredPayload doesn't have a timestamp in the proto definition provided.
                // Defaulting to 0ms relative time for its slot as a placeholder.
                // Consider placing it at 4000ms if block proposal time is known/relevant.
                const relativeTime = 0; // Placeholder time
                events.push({
                    type: 'payload',
                    time: relativeTime + baseTimeOffset,
                    // DeliveredPayload also doesn't have 'valueWei' in the proto.
                    // If value needs to be displayed, it might need fetching from the related bid.
                    value: undefined, // No value available on payload object itself
                    label: getEntityName(relayName), // Use relay name from map key
                    slotOffset: slotOffset,
                });
            });
         });
      }


      // Process Block Seen Events (using SlimTimings)
      if (slotData.timings?.blockSeen) {
        Object.entries(slotData.timings.blockSeen).forEach(([nodeId, relativeMsBigInt]) => {
            // relativeMsBigInt is the timestamp (bigint)
            const relativeTime = Number(relativeMsBigInt); // Convert bigint to number
            events.push({
                type: 'block',
                time: relativeTime + baseTimeOffset,
                value: nodeId, // Store the full node ID
                label: getNodeNameFromMapKey(nodeId), // Display formatted node name
                slotOffset: slotOffset,
            });
        });
      }
    };

    // Process slots in order: previous, current, next
    processSlot(previousSlotData, -1);
    processSlot(currentSlotData, 0);
    processSlot(nextSlotData, 1);

    // Sort events by their calculated time on the shared axis
    return events.sort((a, b) => a.time - b.time);
  }, [previousSlotData, currentSlotData, nextSlotData]);

  // --- Timeline Visualization ---
  // Define the time range for the axis (e.g., from start of previous slot to end of next slot)
  // If previous slot exists: -12000ms to 24000ms (36s total)
  // Otherwise: 0ms to 24000ms (24s total)
  const minTime = previousSlotData ? -SLOT_DURATION_MS : 0;
  const maxTime = SLOT_DURATION_MS * 2; // Always show current and next slot range fully
  const totalDuration = maxTime - minTime;

  // Calculate position percentage for an event time
  const calculatePosition = (time: number): number => {
    if (totalDuration === 0) return 0; // Avoid division by zero
    const position = ((time - minTime) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position)); // Clamp between 0% and 100%
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'bid': return <Layers3 className="w-3 h-3 text-blue-400 shrink-0" />;
      case 'payload': return <PackageCheck className="w-3 h-3 text-green-400 shrink-0" />;
      case 'block': return <Box className="w-3 h-3 text-purple-400 shrink-0" />;
      default: return null;
    }
  };

  const getEventColorClass = (type: TimelineEvent['type']) => {
     switch (type) {
      case 'bid': return 'border-blue-400/50 bg-blue-900/30 hover:bg-blue-900/60';
      case 'payload': return 'border-green-400/50 bg-green-900/30 hover:bg-green-900/60';
      case 'block': return 'border-purple-400/50 bg-purple-900/30 hover:bg-purple-900/60';
      default: return 'border-gray-500/50 bg-gray-800/30 hover:bg-gray-800/60';
    }
  }

  const formatEventValue = (event: TimelineEvent): string => {
    if (event.value === undefined || event.value === null) return '';
    // Moved declaration outside switch
    let formattedValue = '';
    switch (event.type) {
        case 'bid':
             // Use the simplified inline formatter
            formattedValue = formatGweiSimple(event.value);
            return formattedValue !== 'N/A' ? `(${formattedValue} Gwei)` : '';
        case 'payload':
             // Payload value is currently undefined based on proto
             return ''; // Or display placeholder if needed
        case 'block':
            return ''; // Block value (nodeId) is not displayed directly here
        default: return '';
    }
  }

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-surface/30 rounded-lg border border-subtle p-4 font-mono">
      {/* Timeline Axis Background */}
      <div className="absolute inset-y-0 left-0 right-0 flex border-b border-dashed border-subtle/50">
        {/* Slot Boundaries */}
        {previousSlotData && (
          <div
            className="h-full border-r border-dashed border-subtle/50"
            style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }}
            title={`Slot ${currentSlotNumber ? currentSlotNumber - 1 : 'Previous'}`}
          ></div>
        )}
        <div
          className="h-full border-r border-dashed border-subtle/50"
          style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }}
          title={`Slot ${currentSlotNumber ?? 'Current'}`}
        ></div>
         <div
          className="h-full" // No right border for the last segment
          style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }}
          title={`Slot ${currentSlotNumber ? currentSlotNumber + 1 : 'Next'}`}
        ></div>
      </div>

       {/* Slot Labels */}
       <div className="absolute top-1 left-0 right-0 flex text-xs text-muted">
         {previousSlotData && currentSlotNumber && (
           <div style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }} className="text-center opacity-70">
             Slot {currentSlotNumber - 1}
           </div>
         )}
         {currentSlotNumber && (
            <div style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }} className="text-center font-medium text-primary">
                Slot {currentSlotNumber}
            </div>
         )}
         {currentSlotNumber && (
            <div style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }} className="text-center opacity-70">
                Slot {currentSlotNumber + 1}
            </div>
         )}
       </div>


      {/* Current Time Marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-accent z-10"
        style={{ left: `${calculatePosition(currentTime)}%` }}
        title={`Current Time: ${(currentTime / 1000).toFixed(1)}s`}
      >
         <div className="absolute -top-2 -translate-x-1/2 left-1/2 w-2 h-2 bg-accent rounded-full"></div>
      </div>

      {/* Events */}
      <div className="relative h-full pt-6 pb-2 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-raised scrollbar-track-surface">
        {processedEvents.map((event, index) => {
          const isFutureEvent = event.time > currentTime;
          const position = calculatePosition(event.time);
          // Simple vertical stacking based on index for now to avoid overlap
          // A more sophisticated layout might be needed for dense events
          const verticalPosition = (index % 5) * 20 + 10; // Example: 5 vertical lanes

          return (
            <div
              key={`${event.type}-${event.time}-${event.label}-${index}`} // Basic key, might need improvement
              className={clsx(
                'absolute transition-opacity duration-300 ease-in-out transform -translate-y-1/2',
                'px-2 py-1 rounded border text-xs shadow-sm cursor-default',
                 getEventColorClass(event.type),
                isFutureEvent ? 'opacity-40' : 'opacity-90'
              )}
              style={{
                left: `${position}%`,
                top: `${verticalPosition}%`, // Adjust vertical positioning logic as needed
                // Add a small horizontal offset to avoid exact overlap with time marker
                transform: `translateY(-50%) translateX(${event.time === currentTime ? '4px' : '0px'})`,
              }}
              title={`${event.type.charAt(0).toUpperCase() + event.type.slice(1)} at ${(event.time / 1000).toFixed(3)}s\nLabel: ${event.label}\nValue: ${event.type === 'bid' ? formatGweiSimple(event.value) + ' Gwei' : (event.type === 'block' ? event.value : 'N/A')}`}
            >
              <div className="flex items-center gap-1.5 truncate">
                 {getEventIcon(event.type)}
                 <span className="truncate">{event.label} {formatEventValue(event)}</span>
              </div>
            </div>
          );
        })}
         {processedEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                Waiting for events...
            </div>
         )}
      </div>
    </div>
  );
};