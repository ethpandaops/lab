import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useBeacon from '@/contexts/beacon';
import { useSlotData } from '@/hooks/useSlotData';
import { useExperimentConfig } from '@/hooks/useExperimentConfig';
import SlotDataStore from '@/utils/SlotDataStore';
import useNetwork from '@/contexts/network';
import { TimelineProvider } from '@/contexts/timeline';
import {
  MobileBlockProductionView,
  DesktopBlockProductionView,
  generateConsistentColor,
  getTransformedBids,
  BidData,
} from '@/components/beacon/block_production';
import { ExperimentGuard } from '@/components/common/ExperimentGuard';
import { hasNonEmptyDeliveredPayloads } from '@/components/beacon/block_production/common/blockUtils';

/**
 * BlockProductionLivePage visualizes the entire Ethereum block production process
 * across four key stages: Block Builders, MEV Relays, Block Proposers, and Network Nodes.
 * The visualization tracks the flow of blocks through the system in real-time.
 */
export default function BlockProductionLivePage() {
  // Use network directly from NetworkContext - App.tsx handles URL updates
  const { selectedNetwork } = useNetwork();
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

  // Only use mobile view for real mobile devices, use desktop view for tablets
  const isMobile = viewMode === 'mobile';

  const { getBeaconClock, getHeadLagSlots, subscribeToSlotChanges } = useBeacon();
  // Use BeaconClockManager for slot timing
  const clock = getBeaconClock(selectedNetwork);
  const headLagSlots = getHeadLagSlots(selectedNetwork);
  const [headSlot, setHeadSlot] = useState<number | null>(clock ? clock.getCurrentSlot() : null);

  // Fetch experiment config for data availability
  const {
    data: experimentConfig,
    isLoading: isConfigLoading,
    error: configError,
    getNetworkAvailability,
    getSafeSlot,
    isSlotInRange,
    getDataStaleness,
    isSlotBeyondAvailableData,
  } = useExperimentConfig('block-production-flow', selectedNetwork);

  // Reset state when network changes
  useEffect(() => {
    // Get updated clock for the selected network
    const updatedClock = getBeaconClock(selectedNetwork);

    if (updatedClock) {
      // Always use the actual head slot from the clock
      const newSlot = updatedClock.getCurrentSlot();
      setHeadSlot(newSlot);

      // Reset to live position
      setDisplaySlotOffset(0);
      
      // Reset initial slots for new network
      setInitialSafeSlot(null);
      setInitialHeadSlot(null);

      // Clear prefetched slots for the previous network
      prefetchedSlotsRef.current = new Set();

      // Invalidate queries for the previous network to force refetching
      queryClient.invalidateQueries({
        queryKey: ['block-production-live', 'slot'],
      });
    }
  }, [selectedNetwork, getBeaconClock, queryClient]);

  // Use a ref to track if we're at the "live" position
  // This will help determine if we should auto-update when slots change
  const isAtLivePositionRef = useRef<boolean>(true);

  // Subscribe to slot changes
  useEffect(() => {
    if (!selectedNetwork) return;

    // Reset state when network changes to ensure fresh data
    prefetchedSlotsRef.current = new Set();

    // Create a slot change callback
    const slotChangeCallback = (_network: string, newSlot: number, _previousSlot: number) => {
      // Update the head slot
      setHeadSlot(newSlot);
    };

    // Subscribe to slot changes
    const unsubscribe = subscribeToSlotChanges(selectedNetwork, slotChangeCallback);

    // Clean up subscription when component unmounts or network changes
    return () => {
      unsubscribe();
    };
  }, [selectedNetwork, getBeaconClock, getHeadLagSlots, subscribeToSlotChanges]);

  const [displaySlotOffset, setDisplaySlotOffset] = useState<number>(0); // 0 is current, -1 is previous, etc.

  // Update the isAtLivePositionRef whenever displaySlotOffset changes
  useEffect(() => {
    isAtLivePositionRef.current = displaySlotOffset === 0;
  }, [displaySlotOffset]);

  // Use safe slot from backend config as starting point
  // Backend already calculated this with head_delay_slots applied
  const safeSlotFromBackend = getSafeSlot(selectedNetwork);
  
  // Track the initial slots when they first load - freeze these values for stable live progression
  const [initialSafeSlot, setInitialSafeSlot] = useState<number | null>(null);
  const [initialHeadSlot, setInitialHeadSlot] = useState<number | null>(null);
  
  // Set initial slots when backend data first becomes available
  useEffect(() => {
    const networkAvailability = getNetworkAvailability(selectedNetwork);
    const backendHeadSlot = networkAvailability?.headSlot;
    
    if (safeSlotFromBackend !== null && initialSafeSlot === null) {
      setInitialSafeSlot(safeSlotFromBackend);
    }
    
    if (backendHeadSlot !== null && backendHeadSlot !== undefined && initialHeadSlot === null) {
      setInitialHeadSlot(backendHeadSlot);
    }
  }, [safeSlotFromBackend, getNetworkAvailability, selectedNetwork, initialSafeSlot, initialHeadSlot]);
  
  // Calculate current slot position: start from initial safe slot and advance with blockchain
  let baseSlot: number | null = null;
  if (initialSafeSlot !== null && initialHeadSlot !== null && headSlot !== null) {
    // Calculate how many slots have elapsed since we got the initial config
    // This keeps us advancing with the live blockchain using frozen initial values
    const slotsElapsed = headSlot - initialHeadSlot;
    const calculatedSlot = initialSafeSlot + slotsElapsed;
    
    // Cap at max available data when in live mode to prevent showing empty slots
    const networkAvailability = getNetworkAvailability(selectedNetwork);
    if (displaySlotOffset === 0 && networkAvailability && calculatedSlot > networkAvailability.maxSlot) {
      baseSlot = networkAvailability.maxSlot;
    } else {
      baseSlot = calculatedSlot;
    }
  } else {
    // Fallback when we don't have the initial data yet
    baseSlot = safeSlotFromBackend;
  }
  
  const slotNumber = baseSlot !== null ? baseSlot + displaySlotOffset : null;

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
          // The unified hook uses different query keys internally based on mode
          // We'll set both potential keys to be safe
          queryClient.setQueryData(['slotData', selectedNetwork, slotNumber], { data: storeData });
          queryClient.setQueryData(['slotData-grpc', selectedNetwork, slotNumber], {
            data: storeData,
          });
          return;
        }

        // Create query keys for both REST and gRPC (the hook decides which to use)
        const restKey = ['slotData', selectedNetwork, slotNumber];
        const grpcKey = ['slotData-grpc', selectedNetwork, slotNumber];

        // Check if we already have data in React Query cache
        const existingRestData = queryClient.getQueryData(restKey);
        const existingGrpcData = queryClient.getQueryData(grpcKey);
        const existingData = existingRestData || existingGrpcData;

        if (existingData) {
          // We already have this data in the cache, store it in our global store too
          slotDataStore.storeSlotData(selectedNetwork, slotNumber, existingData);
          return;
        }

        // Since we're using the unified hook, we can't directly prefetch
        // The best approach is to let the hook handle its own prefetching
        // The unified hook will decide whether to use REST or gRPC internally
      } catch (error) {
        console.error(`[PREFETCH] Failed to prefetch data for slot ${slotNumber}:`, error);
      }
    },
    [headSlot, selectedNetwork, queryClient, slotDataStore],
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
      // Get current time in slot (milliseconds)
      // Use the correct method from BeaconClock to calculate time in slot
      const slotDuration = 12000; // 12 seconds in ms
      const slotProgress = clock ? clock.getCurrentSlotProgress() : 0;
      const timeInSlot = slotProgress * slotDuration;
      const timeToNextSlot = slotDuration - timeInSlot;

      // Calculate the next slot we'll need to display based on our baseSlot logic
      const nextSlot = baseSlot !== null ? baseSlot + 1 : null;


      // Use the callback for prefetching based on timer thresholds
      if (nextSlot !== null) {
        prefetchAtTimerThreshold(nextSlot, timeToNextSlot, timeInSlot);
      }
    };

    // Run the check every 1000ms (reduced from 100ms since we're using TimelineProvider for animations)
    const intervalId = setInterval(checkAndPrefetch, 1000);

    // Initial prefetch of current and next slots when component mounts or network changes
    if (baseSlot !== null) {
      // Clear any previously prefetched slots when network changes
      prefetchedSlotsRef.current = new Set();

      // Safely prefetch the initial slots for the current network
      prefetchMultipleSlotsCallback(baseSlot, 2);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [
    selectedNetwork,
    clock,
    baseSlot,
    prefetchNextSlotData,
    prefetchMultipleSlotsCallback,
    prefetchAtTimerThreshold,
  ]);

  // Navigation and Playback functions - wrapped in useCallback for proper dependency tracking
  // Prefetch previous slot before navigating to reduce flash
  const goToPreviousSlot = React.useCallback(() => {
    if (slotNumber !== null) {
      const prevSlot = slotNumber - 1;
      // Check if previous slot is within available range (use default tolerance)
      if (!isSlotInRange(prevSlot, selectedNetwork)) {
        console.warn(`Cannot navigate to slot ${prevSlot}: outside available range`);
        return;
      }
      // Prefetch previous slot data before navigating
      prefetchPreviousSlotData(prevSlot);
    }
    setDisplaySlotOffset(prev => prev - 1);
  }, [slotNumber, prefetchPreviousSlotData, isSlotInRange, selectedNetwork]);

  const goToNextSlot = React.useCallback(() => {
    // Prevent advancing if we're already transitioning
    if (isTransitioning) {
      return;
    }

    if (slotNumber === null) return;

    const nextSlot = slotNumber + 1;

    // Check if next slot is within available range (use default tolerance)
    if (!isSlotInRange(nextSlot, selectedNetwork)) {
      console.warn(`Cannot navigate to slot ${nextSlot}: outside available range`);
      return;
    }

    // Only allow advancing to next slot if we're not already at the head slot
    if (headSlot !== null && slotNumber < headSlot) {
      // Prefetch next slot data before navigating
      prefetchNextSlotData(nextSlot);
      setDisplaySlotOffset(prev => prev + 1);
    } else if (displaySlotOffset < 0) {
      // If we're on a historical slot, we can move forward even if we don't know the head yet
      prefetchNextSlotData(nextSlot);
      setDisplaySlotOffset(prev => prev + 1);
    }
  }, [
    headSlot,
    slotNumber,
    displaySlotOffset,
    isTransitioning,
    prefetchNextSlotData,
    isSlotInRange,
    selectedNetwork,
  ]);

  const resetToCurrentSlot = React.useCallback(() => {
    // If we have a base slot and we're not already at the current slot
    if (baseSlot !== null && slotNumber !== null && displaySlotOffset !== 0) {
      // Prefetch the current live slot data before resetting
      prefetchSlotData(baseSlot, 'next');
    }

    // Reset to the live position
    setDisplaySlotOffset(0);

    // Reset transition state
    setIsTransitioning(false);
  }, [slotNumber, displaySlotOffset, prefetchSlotData, baseSlot]);

  const isNextDisabled = displaySlotOffset >= 0;

  // Use unified hook for slot data
  const { data: slotData, isLoading: isSlotLoading } = useSlotData({
    network: selectedNetwork,
    slot: slotNumber || undefined,
    isLive: true,
    enabled: slotNumber !== null,
  });

  // Also fetch previous slot data for the blockchain visualization
  const { data: prevSlotData } = useSlotData({
    network: selectedNetwork,
    slot: slotNumber !== null ? slotNumber - 1 : undefined,
    isLive: false,
    enabled: slotNumber !== null && slotNumber > 0,
  });

  // Build combined slot data map for blockchain visualization
  const slotDataCache = useMemo(() => {
    const cache: Record<number, any> = {};
    if (slotNumber !== null && slotData) {
      cache[slotNumber] = slotData;
    }
    if (slotNumber !== null && prevSlotData && slotNumber > 0) {
      cache[slotNumber - 1] = prevSlotData;
    }
    return cache;
  }, [slotNumber, slotData, prevSlotData]);

  // Normal playback enablement
  useEffect(() => {
    if (slotNumber === null) return;

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
    // We need a valid execution payload block hash to determine the winning bid
    if (!slotData?.block?.executionPayloadBlockHash) return null;

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

    // Extract delivered relay names from deliveredPayloads
    const deliveredRelays: string[] = [];
    if (slotData.deliveredPayloads && typeof slotData.deliveredPayloads === 'object') {
      // Add relay names from the deliveredPayloads object
      Object.keys(slotData.deliveredPayloads).forEach(relayName => {
        deliveredRelays.push(relayName);
      });
    }

    // If we don't have relay bids, we can still return information about delivered payloads
    if (!slotData?.relayBids) {
      if (deliveredRelays.length > 0) {
        return {
          blockHash: executionPayloadBlockHash,
          value: 0, // We don't know the value without the bids
          relayName: deliveredRelays[0], // Use the first relay as primary
          deliveredRelays: deliveredRelays,
        };
      }
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

          // Return the winning bid data including deliveredRelays
          return {
            blockHash: matchingBid.blockHash,
            value: valueInEth,
            relayName: relayName,
            builderPubkey: matchingBid.builderPubkey,
            deliveredRelays: deliveredRelays,
          };
        } catch (error) {
          console.error('Error converting bid value:', error);
          // Return partial data if there was an error with the value conversion
          return {
            blockHash: executionPayloadBlockHash,
            value: 0,
            relayName: relayName,
            builderPubkey: matchingBid.builderPubkey,
            deliveredRelays: deliveredRelays,
          };
        }
      }
    }

    // If no matching bid was found but we have delivered payloads
    if (deliveredRelays.length > 0) {
      return {
        blockHash: executionPayloadBlockHash,
        value: 0,
        relayName: deliveredRelays[0], // Use the first relay as primary
        deliveredRelays: deliveredRelays,
      };
    }

    // No matching bid or delivered payloads found
    return null;
  }, [
    slotData?.relayBids,
    slotData?.block?.executionPayloadBlockHash,
    slotData?.deliveredPayloads,
  ]);

  // Determine if a block was locally built using the enhanced method
  const isLocallyBuilt = useMemo(() => {
    if (!slotData) return false;

    // Check for deliveredPayloads both in block and in slotData directly
    return !hasNonEmptyDeliveredPayloads(slotData.block, slotData);
  }, [slotData]);

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

  const timeRange = {
    min: -12000,
    max: 12000,
    ticks: [-12, -9, -6, -3, 0, 3, 6, 9, 12],
  };

  const valueRange = useMemo(() => {
    if (allTransformedBids.length === 0) return { min: 0, max: 1 };
    const values = allTransformedBids.map(b => b.value);
    const maxVal = Math.max(...values);
    return { min: 0, max: maxVal * 1.1 };
  }, [allTransformedBids]);

  // Empty arrays for displaying when no real data
  const emptyBids: BidData[] = [];
  const emptyRelayColors = {};

  return (
    <ExperimentGuard
      experimentId="block-production-flow"
      network={selectedNetwork}
      currentSlot={slotNumber}
    >
      {/* Wrap with TimelineProvider */}
      <TimelineProvider network={selectedNetwork} slotOffset={displaySlotOffset}>
        {/* Conditionally render mobile or desktop view based on screen size */}
        {isMobile ? (
          // Mobile View
          <div className="px-2 py-1">
            <div
              className={`transition-opacity duration-300 ${isSlotLoading ? 'opacity-70' : 'opacity-100'}`}
            >
              <MobileBlockProductionView
                bids={slotData ? allTransformedBids : emptyBids}
                relayColors={slotData ? relayColors : emptyRelayColors}
                winningBid={slotData ? winningBidData : null}
                slot={slotNumber || undefined}
                proposer={slotData?.proposer}
                proposerEntity="TODO"
                nodes={slotData?.nodes || {}}
                nodeBlockSeen={
                  slotData?.timings?.blockSeen
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blockSeen).map(([node, time]) => [
                          node,
                          typeof time === 'bigint' ? Number(time) : Number(time),
                        ]),
                      )
                    : {}
                }
                nodeBlockP2P={
                  slotData?.timings?.blockFirstSeenP2p
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blockFirstSeenP2p).map(([node, time]) => [
                          node,
                          typeof time === 'bigint' ? Number(time) : Number(time),
                        ]),
                      )
                    : {}
                }
                slotData={slotData} // Pass slot data with attestation info
                slotDataCache={slotDataCache} // Pass the cache for adjacent slots
                // Navigation controls
                slotNumber={slotNumber}
                headLagSlots={headLagSlots}
                displaySlotOffset={displaySlotOffset}
                goToPreviousSlot={goToPreviousSlot}
                goToNextSlot={goToNextSlot}
                resetToCurrentSlot={resetToCurrentSlot}
                isNextDisabled={isNextDisabled}
                network={selectedNetwork}
                isLocallyBuilt={isLocallyBuilt}
              />
            </div>
          </div>
        ) : (
          // Desktop View
          <div className="h-full">
            <div
              className={`transition-opacity duration-300 h-full ${isSlotLoading ? 'opacity-70' : 'opacity-100'}`}
            >
              <DesktopBlockProductionView
                bids={slotData ? allTransformedBids : emptyBids}
                relayColors={slotData ? relayColors : emptyRelayColors}
                winningBid={slotData ? winningBidData : null}
                slot={slotNumber || undefined}
                proposer={slotData?.proposer}
                proposerEntity="TODO"
                nodes={slotData?.nodes || {}}
                nodeBlockSeen={
                  slotData?.timings?.blockSeen
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blockSeen).map(([node, time]) => [
                          node,
                          typeof time === 'bigint' ? Number(time) : Number(time),
                        ]),
                      )
                    : {}
                }
                nodeBlockP2P={
                  slotData?.timings?.blockFirstSeenP2p
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blockFirstSeenP2p).map(([node, time]) => [
                          node,
                          typeof time === 'bigint' ? Number(time) : Number(time),
                        ]),
                      )
                    : {}
                }
                slotData={slotData}
                slotDataCache={slotDataCache}
                timeRange={timeRange}
                valueRange={valueRange}
                // Navigation controls
                slotNumber={slotNumber}
                headLagSlots={headLagSlots}
                displaySlotOffset={displaySlotOffset}
                goToPreviousSlot={goToPreviousSlot}
                goToNextSlot={goToNextSlot}
                resetToCurrentSlot={resetToCurrentSlot}
                isNextDisabled={isNextDisabled}
                network={selectedNetwork}
                isLocallyBuilt={isLocallyBuilt}
              />
            </div>
          </div>
        )}
      </TimelineProvider>
    </ExperimentGuard>
  );
}
