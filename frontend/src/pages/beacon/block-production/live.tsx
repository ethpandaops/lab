import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import { BeaconClockManager } from '../../../utils/beacon';
import SlotDataStore from '../../../utils/SlotDataStore';
import NetworkContext from '@/contexts/NetworkContext';
import {
  MobileBlockProductionView,
  DesktopBlockProductionView,
  generateConsistentColor,
  getTransformedBids,
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

  // Add state to handle screen size with more granular breakpoints
  const [viewMode, setViewMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Detect screen size and update view mode
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      
      if (width < 768) {
        setViewMode('mobile'); // Mobile phone
      } else if (width < 1200) {
        setViewMode('tablet'); // Tablet or small laptop
      } else {
        setViewMode('desktop'); // Full desktop
      }
    };

    // Check immediately
    checkScreenSize();

    // Listen for window resize events
    window.addEventListener('resize', checkScreenSize);

    // Clean up event listener
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Simplified check for mobile view (either mobile or tablet uses the mobile view)
  const isMobile = viewMode !== 'desktop';

  // Use BeaconClockManager for slot timing
  useContext(NetworkContext); // Keep context connection for potential future use
  const beaconClockManager = BeaconClockManager.getInstance();
  const clock = beaconClockManager.getBeaconClock(selectedNetwork);

  const headLagSlots = beaconClockManager.getHeadLagSlots(selectedNetwork);
  const [headSlot, setHeadSlot] = useState<number | null>(clock ? clock.getCurrentSlot() : null);

  // Use a ref to track if we're at the "live" position
  // This will help determine if we should auto-update when slots change
  const isAtLivePositionRef = useRef<boolean>(true);

  // Use a ref to track first render of interval effect
  const isFirstRender = useRef<boolean>(true);

  // Ref to track the actual time value and avoid conflicts between state updates
  const timeRef = useRef<number>(0);

  // Define isPlaying state here, before we use it in refs
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // Control playback

  // Store the playing state in a ref to avoid dependency cycles
  const isPlayingRef = useRef(isPlaying);

  // Update the ref when isPlaying changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Subscribe to slot changes
  useEffect(() => {
    if (!selectedNetwork) return;

    // Create a slot change callback
    const slotChangeCallback: SlotChangeCallback = (network, newSlot, previousSlot) => {
      // Only update the head slot if we're in play mode
      // This prevents real-world slot changes from affecting our visualization when paused
      if (isPlayingRef.current) {
        // Update the head slot
        setHeadSlot(newSlot);

        // NOTE: We don't reset time here - we'll handle that in the slotNumber effect
      }
    };

    // Subscribe to slot changes
    const unsubscribe = beaconClockManager.subscribeToSlotChanges(
      selectedNetwork,
      slotChangeCallback,
    );

    // Clean up subscription when component unmounts or network changes
    return () => {
      unsubscribe();
    };
  }, [selectedNetwork, beaconClockManager]);

  const [displaySlotOffset, setDisplaySlotOffset] = useState<number>(0); // 0 is current, -1 is previous, etc.
  const [currentTime, setCurrentTime] = useState<number>(0); // ms into slot
  // isPlaying is already defined above (line 66)

  // Update the isAtLivePositionRef whenever displaySlotOffset changes
  useEffect(() => {
    isAtLivePositionRef.current = displaySlotOffset === 0;
  }, [displaySlotOffset]);

  // Calculate the base slot with proper lag
  // Adding extra 2 slots of lag for processing to match behavior in beacon/live.tsx
  const baseSlot = headSlot ? headSlot - (headLagSlots + 2) : null;
  const slotNumber = baseSlot !== null ? baseSlot + displaySlotOffset : null;

  const labApiClient = getLabApiClient();

  // Track if a slot transition is in progress to prevent double transitions
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Define prefetch helpers with useCallback to avoid unnecessary recreations
  // Get the slot data store instance
  const slotDataStore = useMemo(() => SlotDataStore.getInstance(), []);

  // Enhanced data prefetching function with global storage
  const prefetchSlotData = React.useCallback(
    async (slotNumber: number | null, direction: 'next' | 'previous') => {
      if (slotNumber === null) return;

      // Don't try to prefetch slots that are too far in the future
      if (direction === 'next' && headSlot !== null && slotNumber > headSlot + 1) return;

      // Don't prefetch negative slots
      if (slotNumber < 0) return;

      try {
        // First check the global slot data store
        if (slotDataStore.hasSlotData(selectedNetwork, slotNumber)) {
          // Still need to update React Query cache with this data for the component to use it
          const storeData = slotDataStore.getSlotData(selectedNetwork, slotNumber);
          const queryKey = ['block-production-live', 'slot', selectedNetwork, slotNumber];
          queryClient.setQueryData(queryKey, storeData);
          return;
        }

        // Create a query key for this slot - must match the key used in the main useQuery
        const queryKey = ['block-production-live', 'slot', selectedNetwork, slotNumber];

        // Check if we already have data in React Query cache
        const existingData = queryClient.getQueryData(queryKey);
        if (existingData) {
          // We already have this data in the cache, store it in our global store too
          slotDataStore.storeSlotData(selectedNetwork, slotNumber, existingData);
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

          // Store the data in our global store
          slotDataStore.storeSlotData(selectedNetwork, slotNumber, res.data);

          return res.data;
        };

        // Use React Query's prefetchQuery with updated v4 format
        // The first argument must be an object with queryKey and queryFn properties
        await queryClient.prefetchQuery({
          queryKey: queryKey,
          queryFn: queryFn,
          staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        });
      } catch (error) {
        console.error(`[PREFETCH] Failed to prefetch data for slot ${slotNumber}:`, error);
      }
    },
    [headSlot, selectedNetwork, queryClient, labApiClient, slotDataStore],
  );

  // Prefetching next slot's data
  const prefetchNextSlotData = React.useCallback(
    async (nextSlotNumber: number | null) => {
      await prefetchSlotData(nextSlotNumber, 'next');
    },
    [prefetchSlotData],
  );

  // Prefetching previous slot's data
  const prefetchPreviousSlotData = React.useCallback(
    async (prevSlotNumber: number | null) => {
      await prefetchSlotData(prevSlotNumber, 'previous');
    },
    [prefetchSlotData],
  );

  // Reference for tracking prefetched slots (must be outside useEffect)
  const prefetchedSlotsRef = useRef<Set<number>>(new Set());

  // Helper function for prefetching multiple slots (defined outside of effects)
  const prefetchMultipleSlotsCallback = React.useCallback(
    (baseSlotNumber: number, count: number) => {
      // Skip invalid inputs
      if (baseSlotNumber === null || count <= 0) return;

      // Prefetch 'count' slots ahead
      for (let i = 0; i < count; i++) {
        const slotToPrefetch = baseSlotNumber + i;

        // Skip if we've already prefetched this slot in this cycle
        if (prefetchedSlotsRef.current.has(slotToPrefetch)) continue;

        // Mark as prefetched for this cycle
        prefetchedSlotsRef.current.add(slotToPrefetch);

        // Queue the prefetch with a small delay to avoid overwhelming the API
        const delay = i * 200; // Stagger prefetches by 200ms

        // Use setTimeout outside of the component rendering
        setTimeout(() => {
          prefetchNextSlotData(slotToPrefetch);
        }, delay);
      }
    },
    [prefetchNextSlotData],
  );

  // Staggered prefetching in response to timer thresholds
  const prefetchAtTimerThreshold = React.useCallback(
    (nextDisplaySlot: number, timeToNextSlot: number, timeInSlot: number) => {
      // At 11s (start of slot), prefetch the next 3 slots
      if (timeToNextSlot <= 11000 && timeToNextSlot > 10900) {
        prefetchMultipleSlotsCallback(nextDisplaySlot, 3);
      }
      // At 10s, prefetch the next slot
      else if (timeToNextSlot <= 10000 && timeToNextSlot > 9900) {
        prefetchNextSlotData(nextDisplaySlot);
      }
      // At 5s, prefetch the next 2 slots again (refresh data)
      else if (timeToNextSlot <= 5000 && timeToNextSlot > 4900) {
        prefetchMultipleSlotsCallback(nextDisplaySlot, 2);
      }
      // At 1s, prefetch just the next slot (final refresh before transition)
      else if (timeToNextSlot <= 1000 && timeToNextSlot > 900) {
        prefetchNextSlotData(nextDisplaySlot);
      }
      // At the very start of a new slot, reset the prefetched slots tracker
      else if (timeInSlot < 100) {
        prefetchedSlotsRef.current = new Set();
      }
    },
    [prefetchNextSlotData, prefetchMultipleSlotsCallback],
  );

  // Enhanced early prefetching at multiple time points and multiple slots ahead
  useEffect(() => {
    if (!selectedNetwork || !clock) return;

    // Function to check if we should prefetch - avoids calling hooks inside
    const checkAndPrefetch = () => {
      // Only prefetch if we're playing - prevents unwanted slot changes while paused
      if (!isPlayingRef.current) return;

      // Get current time in slot (milliseconds)
      // Use the correct method from BeaconClock to calculate time in slot
      const slotDuration = 12000; // 12 seconds in ms
      const slotProgress = clock ? clock.getCurrentSlotProgress() : 0;
      const timeInSlot = slotProgress * slotDuration;
      const timeToNextSlot = slotDuration - timeInSlot;

      // Calculate the next slot we'll need to display
      const nextHeadSlot = (headSlot || 0) + 1;
      // Adding extra 2 slots of lag for processing to match behavior in prefetch logic
      const nextDisplaySlot = nextHeadSlot - (headLagSlots + 2);

      // Use the callback for prefetching based on timer thresholds
      prefetchAtTimerThreshold(nextDisplaySlot, timeToNextSlot, timeInSlot);
    };

    // Run the check every 100ms
    const intervalId = setInterval(checkAndPrefetch, 100);

    // Initial prefetch of current and next slots when component mounts
    if (headSlot !== null) {
      const currentDisplaySlot = headSlot - (headLagSlots + 2);
      const nextDisplaySlot = currentDisplaySlot + 1;

      // Safely prefetch the initial slots
      prefetchMultipleSlotsCallback(currentDisplaySlot, 2);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [
    selectedNetwork,
    clock,
    headSlot,
    headLagSlots,
    prefetchNextSlotData,
    prefetchMultipleSlotsCallback,
    prefetchAtTimerThreshold,
  ]);

  // Navigation and Playback functions - wrapped in useCallback for proper dependency tracking
  // Prefetch previous slot before navigating to reduce flash
  const goToPreviousSlot = React.useCallback(() => {
    if (slotNumber !== null) {
      // Prefetch previous slot data before navigating
      prefetchPreviousSlotData(slotNumber - 1);
    }
    setDisplaySlotOffset(prev => prev - 1);
  }, [slotNumber, prefetchPreviousSlotData]);

  const goToNextSlot = React.useCallback(() => {
    // Prevent advancing if we're already transitioning
    if (isTransitioning) {
      return;
    }

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
    }
  }, [headSlot, slotNumber, displaySlotOffset, isTransitioning, prefetchNextSlotData]);

  const resetToCurrentSlot = React.useCallback(() => {
    // If we have a head slot and we're not already at the current slot
    if (headSlot !== null && slotNumber !== null && displaySlotOffset !== 0) {
      // Calculate what the current slot would be - adding extra 2 slots of lag for processing
      const currentSlot = headSlot - (headLagSlots + 2);
      // Prefetch the current slot data before resetting
      prefetchSlotData(currentSlot, 'next');
    }

    // Reset to the live position
    setDisplaySlotOffset(0);

    // Reset the time counter to 0 for the new slot
    setCurrentTime(0);

    // Ensure we're in playing state
    setIsPlaying(true);
  }, [headSlot, slotNumber, displaySlotOffset, headLagSlots, prefetchSlotData]);
  const isNextDisabled = displaySlotOffset >= 0;
  const togglePlayPause = React.useCallback(() => setIsPlaying(prev => !prev), []);

  const {
    data: slotData,
    isLoading: isSlotLoading,
    error: slotError,
    isPreviousData,
  } = useQuery({
    queryKey: ['block-production-live', 'slot', selectedNetwork, slotNumber],
    queryFn: async () => {
      if (slotNumber === null) return null;

      // First check our global slot data store
      if (slotDataStore.hasSlotData(selectedNetwork, slotNumber)) {
        return slotDataStore.getSlotData(selectedNetwork, slotNumber);
      }

      // Next check if we already have this data cached in React Query
      const existingData = queryClient.getQueryData([
        'block-production-live',
        'slot',
        selectedNetwork,
        slotNumber,
      ]);
      if (existingData) {
        // Store it in our global store too
        slotDataStore.storeSlotData(selectedNetwork, slotNumber, existingData);
        return existingData;
      }

      // No cached data, fetch from API
      const client = await labApiClient;
      const req = new GetSlotDataRequest({
        network: selectedNetwork,
        slot: BigInt(slotNumber),
      });
      const res = await client.getSlotData(req);

      // Store in our global store
      slotDataStore.storeSlotData(selectedNetwork, slotNumber, res.data);

      return res.data;
    },
    refetchInterval: 5000, // Periodically check for updates
    refetchIntervalInBackground: true, // Refetch even if tab is not focused
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    keepPreviousData: true, // Keep showing previous slot's data while loading new data
    retry: 2, // Retry failed requests twice
    enabled: slotNumber !== null,
  });

  // Simple time counter - pure React
  useEffect(() => {
    let currentTime = 0;

    // Simple interval to count time
    const interval = setInterval(() => {
      // Only increment if playing
      if (isPlaying) {
        // Increment by 100ms
        currentTime += 100;

        // Reset at 12 seconds and advance to next slot if at live position
        if (currentTime > 12000) {
          currentTime = 0;

          // If we're at live position (current slot), auto-advance to the next slot
          // by incrementing the head slot (simulating what would happen when the real slot changes)
          if (displaySlotOffset === 0 && !isTransitioning && headSlot !== null) {
            setHeadSlot(headSlot + 1);
          }
        }

        // Update React state only
        setCurrentTime(currentTime);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [slotNumber, isPlaying, displaySlotOffset, isTransitioning, headSlot]);

  // Normal playback enablement
  useEffect(() => {
    if (slotNumber === null) return;

    // Auto-start playback on slot change
    setIsPlaying(true);

    // Reset transition state
    setIsTransitioning(false);
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
    if (
      !executionPayloadBlockHash ||
      typeof executionPayloadBlockHash !== 'string' ||
      executionPayloadBlockHash.length < 10
    ) {
      return null;
    }

    // Search through all relay bids to find a matching block hash
    for (const [relayName, relayData] of Object.entries(slotData.relayBids)) {
      if (!relayData.bids || !Array.isArray(relayData.bids)) continue;

      // Look for a bid with a matching block hash to the execution payload block hash
      const matchingBid = relayData.bids.find(bid => {
        // Both values should be strings and non-empty
        if (
          !bid.blockHash ||
          typeof bid.blockHash !== 'string' ||
          !executionPayloadBlockHash ||
          typeof executionPayloadBlockHash !== 'string'
        ) {
          return false;
        }

        // Normalize both hashes for comparison
        const normalizedBidHash = bid.blockHash.toLowerCase().replace(/^0x/, '');
        const normalizedExecutionHash = executionPayloadBlockHash.toLowerCase().replace(/^0x/, '');

        // Return true if the hashes match
        return normalizedBidHash === normalizedExecutionHash;
      });

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
          console.error('Error converting bid value:', error);
          return null;
        }
      }
    }

    // If no matching bid was found
    console.log(
      'No matching bid found for execution payload block hash:',
      executionPayloadBlockHash,
    );
    return null;
  }, [slotData?.relayBids, slotData?.block?.executionPayloadBlockHash]);

  // Initial transformation of bids from the data
  const isLocallyBuilt = useMemo(() => {
    if (!slotData?.block?.payloadsDelivered || 
        slotData.block.payloadsDelivered.length === 0 || 
        !Array.isArray(slotData.block.payloadsDelivered)) {
      return true;
    }
    return false;
  }, [slotData?.block?.payloadsDelivered]);

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

    // Function to check if a bid matches the winning bid's block hash
    const isBidWinning = (bidBlockHash?: string) => {
      if (!bidBlockHash || !winningBidData?.blockHash) return false;

      // Normalize both hashes for comparison
      const normalizedBidHash = bidBlockHash.toLowerCase().replace(/^0x/, '');
      const normalizedWinningHash = winningBidData.blockHash.toLowerCase().replace(/^0x/, '');

      return normalizedBidHash === normalizedWinningHash;
    };

    Object.entries(slotData.relayBids).forEach(([relayName, relayData]) => {
      if (!relayData.bids || !Array.isArray(relayData.bids)) return;

      relayData.bids.forEach(bid => {
        try {
          const valueInEth = Number(BigInt(bid.value)) / 1e18;
          // Use slotTime directly as it's already relative to slot start in ms
          // Default to 0 if slotTime is undefined or not a number
          const time = typeof bid.slotTime === 'number' ? bid.slotTime : 0;

          // Check if this bid is the winning bid by comparing block hashes
          const isWinning = isBidWinning(bid.blockHash);

          bidsForVisualizer.push({
            relayName: relayName,
            value: valueInEth,
            time: time,
            blockHash: bid.blockHash,
            builderPubkey: bid.builderPubkey,
            isWinning: isWinning,
          });
        } catch (error) {
          console.debug(`Error processing bid from ${relayName}:`, error);
          /* Skip bid if conversion fails */
        }
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
    <div className="flex flex-col h-full bg-base">
      {/* Conditionally render mobile or desktop view based on screen size */}
      {isMobile ? (
        // Mobile View
        <div className="px-2 py-1">
          <div
            className={`transition-opacity duration-300 ${isSlotLoading && !isPreviousData ? 'opacity-70' : 'opacity-100'}`}
          >
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
              nodeBlockSeen={
                displayData.timings?.blockSeen
                  ? Object.fromEntries(
                      Object.entries(displayData.timings.blockSeen).map(([node, time]) => [
                        node,
                        typeof time === 'bigint' ? Number(time) : Number(time),
                      ]),
                    )
                  : {}
              }
              nodeBlockP2P={
                displayData.timings?.blockFirstSeenP2p
                  ? Object.fromEntries(
                      Object.entries(displayData.timings.blockFirstSeenP2p).map(([node, time]) => [
                        node,
                        typeof time === 'bigint' ? Number(time) : Number(time),
                      ]),
                    )
                  : {}
              }
              block={displayData.block}
              slotData={displayData} // Pass slot data with attestation info
              // Navigation controls
              slotNumber={slotNumber}
              headLagSlots={headLagSlots}
              displaySlotOffset={displaySlotOffset}
              isPlaying={isPlaying}
              goToPreviousSlot={goToPreviousSlot}
              goToNextSlot={goToNextSlot}
              resetToCurrentSlot={resetToCurrentSlot}
              togglePlayPause={togglePlayPause}
              isNextDisabled={isNextDisabled}
              network={selectedNetwork} // Pass network to MobileBlockProductionView
              isLocallyBuilt={isLocallyBuilt}
            />
          </div>
        </div>
      ) : (
        // Desktop View
        <div className="h-full">
          <div
            className={`transition-opacity duration-300 h-full ${isSlotLoading && !isPreviousData ? 'opacity-70' : 'opacity-100'}`}
          >
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
              nodeBlockSeen={
                displayData.timings?.blockSeen
                  ? Object.fromEntries(
                      Object.entries(displayData.timings.blockSeen).map(([node, time]) => [
                        node,
                        typeof time === 'bigint' ? Number(time) : Number(time),
                      ]),
                    )
                  : {}
              }
              nodeBlockP2P={
                displayData.timings?.blockFirstSeenP2p
                  ? Object.fromEntries(
                      Object.entries(displayData.timings.blockFirstSeenP2p).map(([node, time]) => [
                        node,
                        typeof time === 'bigint' ? Number(time) : Number(time),
                      ]),
                    )
                  : {}
              }
              block={displayData.block}
              slotData={displayData}
              timeRange={timeRange}
              valueRange={valueRange}
              // Navigation controls
              slotNumber={slotNumber}
              headLagSlots={headLagSlots}
              displaySlotOffset={displaySlotOffset}
              isPlaying={isPlaying}
              goToPreviousSlot={goToPreviousSlot}
              goToNextSlot={goToNextSlot}
              resetToCurrentSlot={resetToCurrentSlot}
              togglePlayPause={togglePlayPause}
              isNextDisabled={isNextDisabled}
              network={selectedNetwork} // Pass network to DesktopBlockProductionView
              isLocallyBuilt={isLocallyBuilt}
            />
          </div>
        </div>
      )}
    </div>
  );
}
