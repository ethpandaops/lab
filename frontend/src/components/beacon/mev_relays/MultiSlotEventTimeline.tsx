import React, { useMemo } from 'react';
import { BeaconSlotData } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { Box, PackageCheck, Zap, ChevronRight } from 'lucide-react';

// Define the structure for events processed for the timeline
interface TimelineEvent {
  type: 'bid' | 'payload' | 'block';
  time: number; // Time in milliseconds relative to the start of the *current* slot (can be negative or > 12000)
  value?: bigint | number | string; // e.g., bid value, payload value, block node ID
  relay: string; // The relay name
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

// Utility function to format Gwei value simply 
const formatGweiSimple = (value: bigint | number | string | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  try {
    let bigIntValue: bigint;
    if (typeof value === 'bigint') {
      bigIntValue = value;
    } else if (typeof value === 'number') {
      bigIntValue = BigInt(Math.floor(value));
    } else {
      bigIntValue = BigInt(value);
    }
    
    // Convert Wei to Gwei (divide by 10^9)
    const gweiValue = Number(bigIntValue / (10n**9n)); 
    
    // Format based on size
    if (gweiValue >= 1_000_000) {
      return `${(gweiValue / 1_000_000).toFixed(1)}M`;
    } else if (gweiValue >= 1_000) {
      return `${(gweiValue / 1_000).toFixed(1)}K`;
    } else {
      return `${gweiValue.toFixed(1)}`;
    }
  } catch (error) {
    console.error("Error formatting Gwei value:", error);
    return 'N/A';
  }
};

// Helper to format ETH value for tooltip
const formatEthValue = (wei: string | bigint | number | undefined): string => {
  if (wei === undefined || wei === null) return 'N/A';
  try {
    let weiBigInt: bigint;
    if (typeof wei === 'bigint') {
      weiBigInt = wei;
    } else if (typeof wei === 'number') {
      weiBigInt = BigInt(Math.floor(wei));
    } else {
      weiBigInt = BigInt(wei);
    }
    const ethValue = Number(weiBigInt * 10000n / (10n**18n)) / 10000;
    return ethValue.toFixed(4);
  } catch (error) {
    console.error("Error formatting ETH value:", error);
    return 'N/A';
  }
};

// Function to format node ID for display
const getNodeNameFromMapKey = (nodeId: string | number | bigint): string => {
  const idStr = String(nodeId);
  if (idStr.length > 10) {
    return `${idStr.substring(0, 6)}...`;
  }
  return idStr;
};

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
        Object.entries(slotData.relayBids).forEach(([relay, relayBidsContainer]) => {
          relayBidsContainer.bids.forEach((bid) => {
            // Use bid.slotTime which is already relative ms
            const relativeTime = bid.slotTime;
            events.push({
              type: 'bid',
              time: relativeTime + baseTimeOffset,
              value: bid.value, // Value is string representation of uint256
              relay, // Store relay name directly
              slotOffset: slotOffset,
            });
          });
        });
      }

      // Process Delivered Payloads from the map
      if (slotData.deliveredPayloads) {
        Object.entries(slotData.deliveredPayloads).forEach(([relay, deliveredPayloadsContainer]) => {
          // Iterate through payloads, but the payload object itself isn't used for the event data here
          deliveredPayloadsContainer.payloads.forEach(() => {
            // DeliveredPayload doesn't have a timestamp in the proto definition provided.
            // Defaulting to 4000ms relative time as a reasonable estimate
            const relativeTime = 4000; // More realistic time
            events.push({
              type: 'payload',
              time: relativeTime + baseTimeOffset,
              value: undefined, // No value available on payload object itself
              relay, // Store relay name directly
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
            relay: 'node:' + getNodeNameFromMapKey(nodeId), // Prefix for node events
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

  // Define the time range for the axis
  const minTime = previousSlotData ? -SLOT_DURATION_MS : 0;
  const maxTime = SLOT_DURATION_MS * 2; // Always show current and next slot range fully
  const totalDuration = maxTime - minTime;

  // Calculate position percentage for an event time
  const calculatePosition = (time: number): number => {
    if (totalDuration === 0) return 0; // Avoid division by zero
    const position = ((time - minTime) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position)); // Clamp between 0% and 100%
  };

  // Group events by relay for a more organized display
  const eventsByRelay = useMemo(() => {
    const groupedEvents = new Map<string, TimelineEvent[]>();
    
    processedEvents.forEach(event => {
      if (!groupedEvents.has(event.relay)) {
        groupedEvents.set(event.relay, []);
      }
      if (event.time <= currentTime) { // Only show events up to current time
        groupedEvents.get(event.relay)!.push(event);
      }
    });
    
    return groupedEvents;
  }, [processedEvents, currentTime]);

  // Assign colors to relays
  const relayColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorOptions = [
      'bg-red-600 text-white',
      'bg-blue-600 text-white',
      'bg-green-600 text-white',
      'bg-yellow-600 text-black',
      'bg-purple-600 text-white',
      'bg-pink-600 text-white',
      'bg-indigo-600 text-white',
      'bg-cyan-600 text-white',
    ];
    
    // All relays from all slots
    const relays = new Set<string>();
    [previousSlotData, currentSlotData, nextSlotData].forEach(slotData => {
      if (slotData?.relayBids) {
        Object.keys(slotData.relayBids).forEach(relay => relays.add(relay));
      }
    });
    
    // Assign colors
    [...relays].forEach((relay, index) => {
      colors[relay] = colorOptions[index % colorOptions.length];
    });
    
    // Node colors
    colors['node'] = 'bg-gray-600 text-white';
    
    return colors;
  }, [previousSlotData, currentSlotData, nextSlotData]);

  // Count events by type for summary
  const bidCount = processedEvents.filter(e => e.type === 'bid' && e.time <= currentTime).length;
  const payloadCount = processedEvents.filter(e => e.type === 'payload' && e.time <= currentTime).length;
  const blockCount = processedEvents.filter(e => e.type === 'block' && e.time <= currentTime).length;

  return (
    <div className="space-y-4">
      {/* Progress bar and event counts */}
      <div className="relative h-8 bg-gray-900 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-gradient-to-r from-indigo-900 via-purple-900 to-violet-900"
          style={{ 
            width: `${(currentTime / 12000) * 100}%`, 
            transition: 'width 100ms linear',
            boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)' 
          }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1 bg-yellow-500/80 text-black rounded-full px-2 py-0.5 text-xs font-bold">
              <Zap className="h-3 w-3" />
              <span>{bidCount}</span>
            </div>
            <div className="flex items-center gap-1 bg-green-500/80 text-black rounded-full px-2 py-0.5 text-xs font-bold">
              <PackageCheck className="h-3 w-3" />
              <span>{payloadCount}</span>
            </div>
            <div className="flex items-center gap-1 bg-purple-500/80 text-black rounded-full px-2 py-0.5 text-xs font-bold">
              <Box className="h-3 w-3" />
              <span>{blockCount}</span>
            </div>
          </div>
          <div className="text-white text-xs font-mono">
            {(currentTime / 1000).toFixed(1)}s / 12s
          </div>
        </div>
      </div>

      {/* Slot Boundaries Indicator */}
      <div className="flex text-xs text-center font-medium text-gray-400 mb-2">
        {previousSlotData && currentSlotNumber && (
          <div style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }}>
            Slot {currentSlotNumber - 1}
          </div>
        )}
        {currentSlotNumber && (
          <div 
            style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }}
            className="text-white"
          >
            Slot {currentSlotNumber}
          </div>
        )}
        {currentSlotNumber && (
          <div style={{ width: `${(SLOT_DURATION_MS / totalDuration) * 100}%` }}>
            Slot {currentSlotNumber + 1}
          </div>
        )}
      </div>

      {/* Event Timeline - Relay oriented */}
      <div className="space-y-2">
        {Array.from(eventsByRelay.entries()).map(([relay, events]) => {
          // Skip empty relay entries
          if (events.length === 0) return null;
          
          // Get color for relay
          const baseColor = relay.startsWith('node:') 
            ? 'bg-gray-700 text-white' 
            : (relayColors[relay] || 'bg-gray-700 text-white');
          
          // Format relay name
          const displayName = relay.startsWith('node:') ? relay.substring(5) : relay;
          
          // Get counts
          const relayBidCount = events.filter(e => e.type === 'bid').length;
          const relayPayloadCount = events.filter(e => e.type === 'payload').length;
          const relayBlockCount = events.filter(e => e.type === 'block').length;
          
          // Find best bid
          const bestBid = events
            .filter(e => e.type === 'bid')
            .sort((a, b) => {
              try {
                return BigInt(String(b.value || 0)) > BigInt(String(a.value || 0)) ? 1 : -1;
              } catch {
                return 0;
              }
            })[0];
          
          return (
            <div 
              key={relay}
              className="bg-gray-900/40 rounded-lg border border-gray-800 overflow-hidden"
            >
              {/* Relay Header */}
              <div className={`${baseColor} p-2 flex justify-between items-center`}>
                <div className="font-medium">{displayName}</div>
                <div className="flex items-center space-x-2 text-xs">
                  {relayBidCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>{relayBidCount}</span>
                    </div>
                  )}
                  {relayPayloadCount > 0 && (
                    <div className="flex items-center gap-1">
                      <PackageCheck className="h-3 w-3" />
                      <span>{relayPayloadCount}</span>
                    </div>
                  )}
                  {relayBlockCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Box className="h-3 w-3" />
                      <span>{relayBlockCount}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Event Markers */}
              <div className="relative h-10 px-4">
                {events.map((event, idx) => {
                  const position = calculatePosition(event.time);
                  const eventIcon = (() => {
                    switch (event.type) {
                      case 'bid': return <Zap className="h-4 w-4 text-yellow-500" />;
                      case 'payload': return <PackageCheck className="h-4 w-4 text-green-500" />;
                      case 'block': return <Box className="h-4 w-4 text-purple-500" />;
                      default: return null;
                    }
                  })();
                  
                  return (
                    <div
                      key={`${relay}-${event.type}-${idx}`}
                      className="absolute top-1/2 transform -translate-y-1/2 cursor-pointer"
                      style={{ left: `${position}%` }}
                      title={
                        event.type === 'bid' 
                          ? `${relay} bid: ${formatEthValue(event.value)} ETH (${formatGweiSimple(event.value)} Gwei)`
                          : event.type === 'payload'
                          ? `${relay} delivered payload`
                          : `Block seen by ${displayName}`
                      }
                    >
                      {eventIcon}
                    </div>
                  );
                })}
                
                {/* Best bid highlight */}
                {bestBid && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 flex items-center px-4">
                    <div 
                      className="px-1 bg-yellow-500 text-[9px] text-black font-medium rounded"
                      style={{ 
                        position: 'absolute',
                        left: `${calculatePosition(bestBid.time)}%`,
                        transform: 'translateX(-50%)'
                      }}
                      title={`Best bid: ${formatEthValue(bestBid.value)} ETH`}
                    >
                      {formatGweiSimple(bestBid.value)}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Connection Lines */}
              <div className="relative h-1 bg-gray-800">
                {/* Progress Line */}
                <div 
                  className="h-full bg-white/20"
                  style={{ 
                    width: `${calculatePosition(currentTime)}%`,
                    transition: 'width 100ms linear' 
                  }}
                />
              </div>
            </div>
          );
        })}
        
        {eventsByRelay.size === 0 && (
          <div className="h-20 flex items-center justify-center text-gray-400 bg-gray-900/40 rounded-lg border border-gray-800">
            Waiting for events...
          </div>
        )}
      </div>
      
      {/* Current time marker */}
      <div className="relative h-6">
        <div 
          className="absolute h-full border-l-2 border-dashed border-white/40 flex items-center"
          style={{ 
            left: `${calculatePosition(currentTime)}%`,
            transition: 'left 100ms linear'
          }}
        >
          <ChevronRight className="w-4 h-4 -ml-2 text-white" />
        </div>
      </div>
    </div>
  );
};