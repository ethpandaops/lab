import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import { BeaconClockManager } from '../../../utils/beacon';
import { NetworkContext } from '@/App';
import {
  MobileBlockProductionView,
  DesktopBlockProductionView,
  TopControls,
  generateConsistentColor,
  getTransformedBids
} from '@/components/beacon/block_production';

/**
 * BlockProductionLivePage visualizes the entire Ethereum block production process
 * across four key stages: Block Builders, MEV Relays, Block Proposers, and Network Nodes.
 * The visualization tracks the flow of blocks through the system in real-time.
 */
export default function BlockProductionLivePage() {
  const { network } = useParams<{ network?: string }>();
  const selectedNetwork = network || 'mainnet'; // Default to mainnet if no network param
  const queryClient = useQueryClient();
  
  // Add state to handle screen size
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Detect screen size and update state
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical tablet breakpoint
    };
    
    // Check immediately
    checkScreenSize();
    
    // Listen for window resize events
    window.addEventListener('resize', checkScreenSize);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Use BeaconClockManager for slot timing
  useContext(NetworkContext); // Keep context connection for potential future use
  const beaconClockManager = BeaconClockManager.getInstance();
  const clock = beaconClockManager.getBeaconClock(selectedNetwork);

  const headLagSlots = beaconClockManager.getHeadLagSlots(selectedNetwork);
  const headSlot = clock ? clock.getCurrentSlot() : null;

  const [displaySlotOffset, setDisplaySlotOffset] = useState<number>(0); // 0 is current, -1 is previous, etc.
  const [currentTime, setCurrentTime] = useState<number>(0); // ms into slot
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // Control playback

  // Calculate the base slot with proper lag (we add 2 extra slots of lag for data to populate)
  // This matches the behavior in beacon/live.tsx that adds extra lag for data processing
  const baseSlot = headSlot ? headSlot - (headLagSlots + 2) : null;
  const slotNumber = baseSlot !== null ? baseSlot + displaySlotOffset : null;

  const labApiClient = getLabApiClient();

  // Define prefetch helpers upfront
  // Generic data prefetching function with retry and caching strategy
  const prefetchSlotData = async (slotNumber: number | null, direction: 'next' | 'previous') => {
    if (slotNumber === null) return;
    
    // Don't try to prefetch slots that are too far in the future
    if (direction === 'next' && headSlot !== null && slotNumber > headSlot + 1) return;
    
    // Don't prefetch negative slots
    if (slotNumber < 0) return;
    
    try {
      // Create a query key for this slot - must match the key used in the main useQuery
      const queryKey = ['block-production-live', 'slot', selectedNetwork, slotNumber];
      
      // Check if we already have data for this slot
      const existingData = queryClient.getQueryData(queryKey);
      if (existingData) {
        // We already have this data in the cache, no need to fetch it again
        console.log(`Using cached data for ${direction} slot: ${slotNumber}`);
        return;
      }
      
      // Create a query function that will be used for prefetching
      const queryFn = async () => {
        const client = await labApiClient;
        const req = new GetSlotDataRequest({
          network: selectedNetwork,
          slot: BigInt(slotNumber),
        });
        const res = await client.getSlotData(req);
        return res.data;
      };
      
      // Use React Query's prefetchQuery to fetch and cache the data
      await queryClient.prefetchQuery(queryKey, queryFn, {
        staleTime: 30000, // Consider data fresh for 30 seconds
      });
      
      console.log(`Prefetched data for ${direction} slot: ${slotNumber}`);
    } catch (error) {
      console.error(`Failed to prefetch data for slot ${slotNumber}:`, error);
    }
  };

  // Prefetching next slot's data
  const prefetchNextSlotData = async (nextSlotNumber: number | null) => {
    await prefetchSlotData(nextSlotNumber, 'next');
  };
  
  // Prefetching previous slot's data
  const prefetchPreviousSlotData = async (prevSlotNumber: number | null) => {
    await prefetchSlotData(prevSlotNumber, 'previous');
  };

  // Navigation and Playback functions
  // Prefetch previous slot before navigating to reduce flash
  const goToPreviousSlot = () => {
    if (slotNumber !== null) {
      // Prefetch previous slot data before navigating
      prefetchPreviousSlotData(slotNumber - 1);
    }
    setDisplaySlotOffset(prev => prev - 1);
  };
  
  const goToNextSlot = () => {
    // Only allow advancing to next slot if we're not already at the head slot
    if (headSlot !== null && slotNumber !== null && slotNumber < headSlot) {
      // Prefetch next slot data before navigating
      prefetchNextSlotData(slotNumber + 1);
      setDisplaySlotOffset(prev => prev + 1);
    } else if (displaySlotOffset < 0) {
      // If we're on a historical slot, we can move forward even if we don't know the head yet
      if (slotNumber !== null) {
        prefetchNextSlotData(slotNumber + 1);
      }
      setDisplaySlotOffset(prev => prev + 1);
    } else {
      console.log("Already at head slot or next slot, can't advance further");
    }
  };
  
  const resetToCurrentSlot = () => {
    // If we have a head slot and we're not already at the current slot
    if (headSlot !== null && slotNumber !== null && displaySlotOffset !== 0) {
      // Calculate what the current slot would be
      const currentSlot = headSlot - (headLagSlots + 2);
      // Prefetch the current slot data before resetting
      prefetchSlotData(currentSlot, 'next');
    }
    setDisplaySlotOffset(0);
  };
  const isNextDisabled = displaySlotOffset >= 0;
  const togglePlayPause = () => setIsPlaying(prev => !prev);

  const { data: slotData, isLoading: isSlotLoading, error: slotError, isPreviousData } = useQuery({
    queryKey: ['block-production-live', 'slot', selectedNetwork, slotNumber],
    queryFn: async () => {
      if (slotNumber === null) return null;
      
      // First check if we already have this data cached (additional safety check)
      const existingData = queryClient.getQueryData(['block-production-live', 'slot', selectedNetwork, slotNumber]);
      if (existingData) {
        console.log(`Using cached data for main query slot: ${slotNumber}`);
        return existingData;
      }
      
      const client = await labApiClient;
      const req = new GetSlotDataRequest({
        network: selectedNetwork,
        slot: BigInt(slotNumber),
      });
      const res = await client.getSlotData(req);
      return res.data;
    },
    refetchInterval: 5000, // Periodically check for updates
    refetchIntervalInBackground: true, // Refetch even if tab is not focused
    staleTime: 30000, // Consider data fresh for 30 seconds to avoid flashing
    keepPreviousData: true, // Keep showing previous slot's data while loading new data
    retry: 2, // Retry failed requests twice
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
        
        // Calculate the actual next slot number based on current slot and head slot
        const nextSlot = displaySlotOffset === 0 
          ? (slotNumber + 1) // If we're at the live slot, next is just +1
          : baseSlot !== null ? (baseSlot + displaySlotOffset + 1) : null; // Otherwise consider display offset

        // If viewing the *current* slot (offset 0), sync with wall clock
        if (displaySlotOffset === 0) {
          // Start prefetching early - first prefetch at 6 seconds into the slot
          if (msIntoSlot >= 6000 && msIntoSlot < 6100) {
            prefetchNextSlotData(nextSlot);
          }
          
          // Second prefetch at 8 seconds into the slot (4s before end)
          if (msIntoSlot >= 8000 && msIntoSlot < 8100) {
            prefetchNextSlotData(nextSlot);
          }
          
          // Final prefetch at 10 seconds into the slot (2s before end)
          if (msIntoSlot >= 10000 && msIntoSlot < 10100) {
            prefetchNextSlotData(nextSlot);
          }
          
          // With 0.5s remaining, prepare for transition by setting a transition flag
          if (msIntoSlot >= 11500 && msIntoSlot < 11600) {
            // Pre-warm next slot's data one final time just before transitioning
            prefetchNextSlotData(nextSlot);
          }
          
          if (msIntoSlot >= 12000) {
            // Instead of stopping playback, move to the next slot automatically
            goToNextSlot();
            return 0; // Reset time to beginning of new slot
          }
          return Math.max(0, msIntoSlot); // Ensure time doesn't go negative
        } else {
          // For historical slots, just increment playback time
          const next = Math.min(12000, prev + 100); // Increment by 100ms
          
          // Enhanced prefetching for historical slots too
          
          // First prefetch at 6s into the slot
          if (next >= 6000 && prev < 6000) {
            prefetchNextSlotData(nextSlot);
          }
          
          // Second prefetch at 8s into the slot
          if (next >= 8000 && prev < 8000) {
            prefetchNextSlotData(nextSlot);
          }
          
          // Third prefetch at 10s into the slot
          if (next >= 10000 && prev < 10000) {
            prefetchNextSlotData(nextSlot);
          }
          
          // Final prefetch with 0.5s remaining
          if (next >= 11500 && prev < 11500) {
            prefetchNextSlotData(nextSlot);
          }
          
          if (next >= 12000) {
            // Instead of stopping, move to the next slot automatically
            goToNextSlot();
            return 0; // Reset time to beginning of new slot
          }
          return next;
        }
      });
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isPlaying, clock, slotNumber, displaySlotOffset, selectedNetwork, baseSlot, headSlot]);

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
    return getTransformedBids(allTransformedBids, currentTime, winningBidData);
  }, [allTransformedBids, currentTime, winningBidData]);

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

  // Create empty fallback data that matches the structure of real data
  const fallbackData = {
    proposer: null,
    proposerEntity: null,
    nodes: {},
    block: null,
    timings: {
      blockSeen: {},
      blockFirstSeenP2p: {},
    },
    relayBids: {},
  };

  // Always use data - either real data or fallback data
  const displayData = slotData || fallbackData;
  
  // Empty arrays for displaying when no real data
  const emptyBids = [];
  const emptyRelayColors = {};

  return (
    <div className="flex flex-col h-full">
      {/* Top Controls */}
      <TopControls 
        slotNumber={slotNumber}
        headLagSlots={headLagSlots}
        displaySlotOffset={displaySlotOffset}
        isPlaying={isPlaying}
        isMobile={isMobile}
        goToPreviousSlot={goToPreviousSlot}
        goToNextSlot={goToNextSlot}
        resetToCurrentSlot={resetToCurrentSlot}
        togglePlayPause={togglePlayPause}
        isNextDisabled={isNextDisabled}
      />

      {/* Conditionally render mobile or desktop view based on screen size */}
      {isMobile ? (
        // Mobile View
        <div className="px-2 pt-1">
          <div className={`transition-opacity duration-300 ${isSlotLoading && !isPreviousData ? 'opacity-70' : 'opacity-100'}`}>
            <MobileBlockProductionView 
              bids={slotData ? transformedBids : emptyBids}
              currentTime={currentTime}
              relayColors={slotData ? relayColors : emptyRelayColors}
              winningBid={slotData ? winningBidData : null}
              slot={slotNumber || undefined}
              proposer={displayData.proposer}
              proposerEntity={displayData.proposerEntity}
              nodes={displayData.nodes || {}}
              blockTime={displayData.block?.slotTime}
              nodeBlockSeen={displayData.timings?.blockSeen ? 
                Object.fromEntries(Object.entries(displayData.timings.blockSeen).map(([node, time]) => 
                  [node, typeof time === 'bigint' ? Number(time) : Number(time)]
                )) : {}
              }
              nodeBlockP2P={displayData.timings?.blockFirstSeenP2p ? 
                Object.fromEntries(Object.entries(displayData.timings.blockFirstSeenP2p).map(([node, time]) => 
                  [node, typeof time === 'bigint' ? Number(time) : Number(time)]
                )) : {}
              }
              block={displayData.block}
            />
          </div>

          {/* Error state */}
          {slotError && (
            <div className="text-center p-4 text-error rounded bg-error/10 border border-error/20 my-2">
              Error loading block data: {slotError.message}
            </div>
          )}
        </div>
      ) : (
        // Desktop View
        <div className="px-2 pt-1 h-full flex flex-col">
          {/* Error state */}
          {slotError && (
            <div className="text-center p-4 text-error rounded bg-error/10 border border-error/20 mb-2">
              Error loading block data: {slotError.message}
            </div>
          )}
          
          <div className={`transition-opacity duration-300 flex-1 ${isSlotLoading && !isPreviousData ? 'opacity-70' : 'opacity-100'}`}>
            <DesktopBlockProductionView
              bids={slotData ? transformedBids : emptyBids}
              currentTime={currentTime}
              relayColors={slotData ? relayColors : emptyRelayColors}
              winningBid={slotData ? winningBidData : null}
              slot={slotNumber || undefined}
              proposer={displayData.proposer}
              proposerEntity={displayData.proposerEntity}
              nodes={displayData.nodes || {}}
              blockTime={displayData.block?.slotTime}
              nodeBlockSeen={displayData.timings?.blockSeen ? 
                Object.fromEntries(Object.entries(displayData.timings.blockSeen).map(([node, time]) => 
                  [node, typeof time === 'bigint' ? Number(time) : Number(time)]
                )) : {}
              }
              nodeBlockP2P={displayData.timings?.blockFirstSeenP2p ? 
                Object.fromEntries(Object.entries(displayData.timings.blockFirstSeenP2p).map(([node, time]) => 
                  [node, typeof time === 'bigint' ? Number(time) : Number(time)]
                )) : {}
              }
              block={displayData.block}
              slotData={displayData}
              timeRange={timeRange}
              valueRange={valueRange}
            />
          </div>
        </div>
      )}
    </div>
  );
}