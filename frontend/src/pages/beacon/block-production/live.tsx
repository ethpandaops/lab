import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import { MevBidsVisualizer } from '../../../components/beacon/mev_relays/MevBidsVisualizer';
import { SankeyNetworkView } from '../../../components/beacon/mev_relays/SankeyNetworkView';
import { BeaconClockManager } from '../../../utils/beacon';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { NetworkContext } from '@/App';

// Simple hash function to generate a color from a string (e.g., relay name)
const generateConsistentColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  // Generate HSL color - fixed saturation and lightness for consistency
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

/**
 * BlockProductionLivePage visualizes the entire Ethereum block production process
 * across four key stages: Block Builders, MEV Relays, Block Proposers, and Network Nodes.
 * The visualization tracks the flow of blocks through the system in real-time.
 */
export default function BlockProductionLivePage() {
  const { network } = useParams<{ network?: string }>();
  const selectedNetwork = network || 'mainnet'; // Default to mainnet if no network param

  // Use BeaconClockManager for slot timing
  useContext(NetworkContext); // Keep context connection for potential future use
  const beaconClockManager = BeaconClockManager.getInstance();
  const clock = beaconClockManager.getBeaconClock(selectedNetwork);

  const headLagSlots = beaconClockManager.getHeadLagSlots(selectedNetwork);
  const headSlot = clock ? clock.getCurrentSlot() : null;

  const [displaySlotOffset, setDisplaySlotOffset] = useState<number>(0); // 0 is current, -1 is previous, etc.
  const [currentTime, setCurrentTime] = useState<number>(0); // ms into slot
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // Control playback
  // Removed activeTab state since we no longer have tabs

  const baseSlot = headSlot ? headSlot - headLagSlots : null;
  const slotNumber = baseSlot !== null ? baseSlot + displaySlotOffset : null;

  const labApiClient = getLabApiClient();

  const { data: slotData, isLoading: isSlotLoading, error: slotError } = useQuery({
    queryKey: ['block-production-live', 'slot', selectedNetwork, slotNumber],
    queryFn: async () => {
      if (slotNumber === null) return null;
      const client = await labApiClient;
      const req = new GetSlotDataRequest({
        network: selectedNetwork,
        slot: BigInt(slotNumber),
      });
      const res = await client.getSlotData(req);
      return res.data;
    },
    refetchInterval: 5000,
    enabled: slotNumber !== null,
  });

  // Timer effect for playback
  useEffect(() => {
    if (!isPlaying || !clock || slotNumber === null) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const now = Date.now();
        const slotStartTime = clock.getSlotStartTime(slotNumber) * 1000;
        const msIntoSlot = now - slotStartTime;

        // If viewing the *current* slot (offset 0), sync with wall clock
        if (displaySlotOffset === 0) {
          if (msIntoSlot >= 12000) {
            setIsPlaying(false); // Stop playback at the end of the live slot
            return 12000;
          }
          return Math.max(0, msIntoSlot); // Ensure time doesn't go negative
        } else {
          // For historical slots, just increment playback time
          const next = Math.min(12000, prev + 100); // Increment by 100ms
          if (next >= 12000) {
            setIsPlaying(false); // Stop playback at the end
            return 12000;
          }
          return next;
        }
      });
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isPlaying, clock, slotNumber, displaySlotOffset]);

  // Reset timer when slot changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(true); // Auto-play when slot changes
  }, [slotNumber]);

  // --- Data Transformation ---

  const relayColors = useMemo(() => {
    if (!slotData?.relayBids) return {};
    const colors: Record<string, string> = {};
    Object.keys(slotData.relayBids).forEach(relayName => {
      colors[relayName] = generateConsistentColor(relayName);
    });
    return colors;
  }, [slotData?.relayBids]);

  const winningBidData = useMemo(() => {
    // We need both relay bids and a valid execution payload block hash to determine the winning bid
    if (!slotData?.relayBids || !slotData?.block?.executionPayloadBlockHash) return null;

    // The execution payload block hash is the definitive way to identify which bid won
    const executionPayloadBlockHash = slotData.block.executionPayloadBlockHash;
    
    // Ensure it's a non-empty string
    if (!executionPayloadBlockHash || typeof executionPayloadBlockHash !== 'string' || executionPayloadBlockHash.length < 10) {
      console.warn('Invalid execution payload block hash:', executionPayloadBlockHash);
      return null;
    }

    // Search through all relay bids to find a matching block hash
    for (const [relayName, relayData] of Object.entries(slotData.relayBids)) {
      if (!relayData.bids || !Array.isArray(relayData.bids)) continue;

      const matchingBid = relayData.bids.find(bid => 
        bid.blockHash && 
        typeof bid.blockHash === 'string' && 
        bid.blockHash === executionPayloadBlockHash
      );

      if (matchingBid) {
        try {
          // Convert the bid value to ETH (from wei)
          const valueInEth = Number(BigInt(matchingBid.value)) / 1e18;
          
          // Return the winning bid data
          return {
            blockHash: matchingBid.blockHash,
            value: valueInEth,
            relayName: relayName,
            builderPubkey: matchingBid.builderPubkey,
          };
        } catch (error) { 
          console.error('Error processing winning bid:', error);
          return null; 
        }
      }
    }
    
    // If no matching bid was found
    console.info('No matching bid found for execution payload:', executionPayloadBlockHash);
    return null;
  }, [slotData?.relayBids, slotData?.block?.executionPayloadBlockHash]);

  // Initial transformation of bids from the data
  const allTransformedBids = useMemo(() => {
    if (!slotData?.relayBids) return [];

    const bidsForVisualizer: Array<{
      relayName: string;
      value: number;
      time: number;
      blockHash?: string;
      builderPubkey?: string;
      isWinning?: boolean;
    }> = [];

    Object.entries(slotData.relayBids).forEach(([relayName, relayData]) => {
      relayData.bids.forEach(bid => {
        try {
          const valueInEth = Number(BigInt(bid.value)) / 1e18;
          // Use slotTime directly as it's already relative to slot start in ms
          // Default to 0 if slotTime is undefined or not a number
          const time = typeof bid.slotTime === 'number' ? bid.slotTime : 0;

          bidsForVisualizer.push({
            relayName: relayName,
            value: valueInEth,
            time: time,
            blockHash: bid.blockHash,
            builderPubkey: bid.builderPubkey,
            isWinning: bid.blockHash === winningBidData?.blockHash,
          });
        } catch { /* Skip bid if conversion fails */ }
      });
    });
    
    return bidsForVisualizer.sort((a, b) => a.time - b.time);
  }, [slotData?.relayBids, winningBidData]);
  
  // Dynamically filter bids based on current time
  const transformedBids = useMemo(() => {
    // Only show bids that have occurred before the current time
    const timeFilteredBids = allTransformedBids.filter(bid => bid.time <= currentTime);
    
    // Sort by value descending (highest value bids first)
    return [...timeFilteredBids].sort((a, b) => {
      // Always keep winning bid first
      if (a.isWinning && !b.isWinning) return -1;
      if (!a.isWinning && b.isWinning) return 1;
      // Then sort by value
      return b.value - a.value;
    });
  }, [allTransformedBids, currentTime]);

  const totalBids = transformedBids.length;

  const timeRange = {
    min: -12000,
    max: 12000,
    ticks: [-12, -9, -6, -3, 0, 3, 6, 9, 12],
  };

  const valueRange = useMemo(() => {
    if (transformedBids.length === 0) return { min: 0, max: 1 };
    const values = transformedBids.map(b => b.value);
    const maxVal = Math.max(...values);
    return { min: 0, max: maxVal * 1.1 };
  }, [transformedBids]);
  
  // Calculate which continent saw the block first
  const firstContinentToSeeBlock = useMemo(() => {
    // Map of continent codes to full names
    const continentNames: Record<string, string> = {
      'NA': 'North America',
      'SA': 'South America',
      'EU': 'Europe',
      'AS': 'Asia',
      'AF': 'Africa',
      'OC': 'Oceania',
      'AN': 'Antarctica'
    };
    
    if (!slotData?.timings?.blockSeen && !slotData?.timings?.blockFirstSeenP2p) {
      return null;
    }
    
    // Combine API and P2P block seen timings
    const nodeBlockSeen = slotData.timings?.blockSeen ? 
      Object.fromEntries(Object.entries(slotData.timings.blockSeen).map(([node, time]) => 
        [node, typeof time === 'bigint' ? Number(time) : Number(time)]
      )) : {};
      
    const nodeBlockP2P = slotData.timings?.blockFirstSeenP2p ? 
      Object.fromEntries(Object.entries(slotData.timings.blockFirstSeenP2p).map(([node, time]) => 
        [node, typeof time === 'bigint' ? Number(time) : Number(time)]
      )) : {};
    
    // Get earliest node timings grouped by continent
    const continentTimings: Record<string, number> = {};
    const nodeContinent: Record<string, string> = {};
    
    // Map nodes to continents
    Object.entries(slotData.nodes || {}).forEach(([nodeId, node]) => {
      if (node.geo?.continent) {
        nodeContinent[nodeId] = node.geo.continent;
      }
    });
    
    // Process API timings
    Object.entries(nodeBlockSeen).forEach(([nodeId, time]) => {
      const continent = nodeContinent[nodeId];
      if (continent && typeof time === 'number') {
        if (!continentTimings[continent] || time < continentTimings[continent]) {
          continentTimings[continent] = time;
        }
      }
    });
    
    // Process P2P timings
    Object.entries(nodeBlockP2P).forEach(([nodeId, time]) => {
      const continent = nodeContinent[nodeId];
      if (continent && typeof time === 'number') {
        if (!continentTimings[continent] || time < continentTimings[continent]) {
          continentTimings[continent] = time;
        }
      }
    });
    
    // Find earliest continent
    let earliestContinent = null;
    let earliestTime = Infinity;
    
    Object.entries(continentTimings).forEach(([continent, time]) => {
      if (time < earliestTime) {
        earliestTime = time;
        earliestContinent = continent;
      }
    });
    
    // Return full continent name if available
    return earliestContinent ? continentNames[earliestContinent] || earliestContinent : null;
  }, [slotData?.timings, slotData?.nodes]);

  // Pass entity info separately since it might be in a different part of the slotData
  const proposerEntity = slotData?.entity;

  // --- End Data Transformation ---

  // Navigation and Playback functions
  const goToPreviousSlot = () => setDisplaySlotOffset(prev => prev - 1);
  const goToNextSlot = () => setDisplaySlotOffset(prev => prev + 1);
  const resetToCurrentSlot = () => setDisplaySlotOffset(0);
  const isNextDisabled = displaySlotOffset >= 0;
  const togglePlayPause = () => setIsPlaying(prev => !prev);

  return (
    <div className="flex flex-col h-full">
      {/* Compact Top Controls Bar */}
      <div className="flex items-center justify-between py-2 px-4 bg-surface/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousSlot}
            className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
            title="Previous Slot"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-primary" />
          </button>

          <button
            onClick={resetToCurrentSlot}
            className={`px-2 py-1 rounded border font-medium text-xs ${displaySlotOffset === 0
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'bg-surface/50 border-subtle text-secondary hover:bg-hover'
              } transition`}
            disabled={displaySlotOffset === 0}
            title="Return to Current Slot"
          >
            Live
          </button>

          <button
            onClick={goToNextSlot}
            className={`bg-surface/50 p-1.5 rounded border border-subtle transition ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
              }`}
            disabled={isNextDisabled}
            title="Next Slot"
          >
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          </button>

          <div className="text-sm font-mono ml-1 text-primary">
            Slot: {slotNumber ?? "—"}
            {headSlot !== null && slotNumber !== null && displaySlotOffset !== 0 && (
              <span className="ml-1 text-xs text-secondary opacity-70">
                (Lag: {headLagSlots - displaySlotOffset})
              </span>
            )}
          </div>
        </div>

        <button
          onClick={togglePlayPause}
          className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5 text-primary" /> : <Play className="h-3.5 w-3.5 text-primary" />}
        </button>
      </div>

      {/* Timeline has been merged into the hero section in SankeyNetworkView component */}

      {/* Network Tree Visualization */}
      {slotData && (
        <div className="px-4 pt-2">
          <SankeyNetworkView
            bids={transformedBids}
            currentTime={currentTime}
            relayColors={relayColors}
            winningBid={winningBidData}
            slot={slotNumber || undefined}
            proposer={slotData.proposer}
            proposerEntity={proposerEntity}
            nodes={slotData.nodes || {}}
            blockTime={slotData.block?.slotTime}
            // Pass node timing information for block visibility
            nodeBlockSeen={slotData.timings?.blockSeen ? 
              Object.fromEntries(Object.entries(slotData.timings.blockSeen).map(([node, time]) => 
                [node, typeof time === 'bigint' ? Number(time) : Number(time)]
              )) : {}
            }
            nodeBlockP2P={slotData.timings?.blockFirstSeenP2p ? 
              Object.fromEntries(Object.entries(slotData.timings.blockFirstSeenP2p).map(([node, time]) => 
                [node, typeof time === 'bigint' ? Number(time) : Number(time)]
              )) : {}
            }
          />
        </div>
      )}

      {/* Main Content Area (Visualization) */}
      <div className="flex-1 p-4 min-h-0">
        {isSlotLoading && !slotData && <div className="text-center p-8 text-secondary">Loading block production data...</div>}
        {slotError && <div className="text-center p-8 text-error">Error loading block data: {slotError.message}</div>}
        {!isSlotLoading && !slotData && slotNumber !== null && <div className="text-center p-8 text-secondary">No block production data available for slot {slotNumber}.</div>}

        {slotData && (
          <MevBidsVisualizer
            bids={transformedBids}
            currentTime={currentTime}
            relayColors={relayColors}
            winningBid={winningBidData}
            timeRange={timeRange}
            valueRange={valueRange}
            height={420} // Slightly taller for better visibility
          />
        )}
      </div>

    </div>
  );
}