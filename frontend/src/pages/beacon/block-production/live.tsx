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

  // Backend config provides everything we need
  const safeSlotFromBackend = getSafeSlot(selectedNetwork);
  const networkAvailability = getNetworkAvailability(selectedNetwork);
  const maxSlotFromBackend = networkAvailability?.maxSlot;

  // Freeze the initial safeSlot when first loaded (won't change with config refreshes)
  const [initialSafeSlot, setInitialSafeSlot] = useState<number | null>(null);

  // Simple counter: how many slots we've advanced from initial position
  const [slotsAdvanced, setSlotsAdvanced] = useState<number>(0);

  // Use refs to track values that must survive re-renders/StrictMode
  const slotsAdvancedRef = useRef<number>(0);
  const actualInitialSlotRef = useRef<number | null>(null);

  // Use ref for maxSlot to avoid timer restarts when config updates
  const maxSlotRef = useRef<number | null>(maxSlotFromBackend);
  useEffect(() => {
    maxSlotRef.current = maxSlotFromBackend;
  }, [maxSlotFromBackend]);

  // Set initial safe slot ONCE when it first becomes available
  useEffect(() => {
    console.log('SafeSlot effect:', {
      safeSlotFromBackend,
      initialSafeSlot,
      actualInitialSlot: actualInitialSlotRef.current,
      slotsAdvanced: slotsAdvancedRef.current,
      willSet:
        safeSlotFromBackend !== null &&
        actualInitialSlotRef.current === null &&
        slotsAdvancedRef.current === 0,
      timestamp: new Date().toISOString(),
    });

    // Only set initial slot if we haven't initialized yet
    if (
      safeSlotFromBackend !== null &&
      actualInitialSlotRef.current === null &&
      slotsAdvancedRef.current === 0
    ) {
      console.log(
        'SETTING INITIAL SAFE SLOT:',
        safeSlotFromBackend,
        'at',
        new Date().toISOString(),
      );
      actualInitialSlotRef.current = safeSlotFromBackend;
      setInitialSafeSlot(safeSlotFromBackend);
      setSlotsAdvanced(0);
    } else if (
      actualInitialSlotRef.current !== null &&
      (initialSafeSlot === null || slotsAdvanced !== slotsAdvancedRef.current)
    ) {
      // Restore from ref if state was lost (StrictMode)
      console.log('RESTORING state from refs:', {
        initialSlot: actualInitialSlotRef.current,
        slotsAdvanced: slotsAdvancedRef.current,
      });
      setInitialSafeSlot(actualInitialSlotRef.current);
      setSlotsAdvanced(slotsAdvancedRef.current);
    }
  }, [safeSlotFromBackend, initialSafeSlot, slotsAdvanced]); // Check all values

  // Reset when network changes
  useEffect(() => {
    console.log('NETWORK CHANGE DETECTED:', selectedNetwork);
    setInitialSafeSlot(null);
    setSlotsAdvanced(0);
    slotsAdvancedRef.current = 0;
    actualInitialSlotRef.current = null;
  }, [selectedNetwork]);

  // Track last advance time to prevent double-firing
  const lastAdvanceTimeRef = useRef<number>(Date.now());

  // Store initialSafeSlot in a ref so timer doesn't restart when it changes
  const initialSafeSlotRef = useRef<number | null>(initialSafeSlot);
  useEffect(() => {
    initialSafeSlotRef.current = initialSafeSlot;
  }, [initialSafeSlot]);

  // Simple timer: advance by 1 slot every 12 seconds, synchronized with slot boundaries
  useEffect(() => {
    if (displaySlotOffset !== 0) return; // Only auto-advance in live mode
    if (!clock) return; // Need clock for timing

    console.log('CREATING TIMER at', new Date().toISOString());
    const timerId = Math.random();

    // Calculate time until next slot boundary
    const slotProgress = clock.getCurrentSlotProgress();
    const msIntoSlot = Math.floor(slotProgress * 12000);
    const msUntilNextSlot = 12000 - msIntoSlot;

    console.log(
      `Timer ${timerId}: Current slot progress: ${slotProgress.toFixed(3)}, waiting ${msUntilNextSlot}ms until next slot`,
    );

    // Wait until the next slot boundary, then start regular interval
    const initialTimeout = setTimeout(() => {
      console.log(`Timer ${timerId}: Initial advance at slot boundary`);

      // Do the first advance at the slot boundary
      setSlotsAdvanced(current => {
        if (initialSafeSlotRef.current === null) return current;

        const currentSlot = initialSafeSlotRef.current + current;
        const nextSlot = currentSlot + 1;

        // Check against current maxSlot using ref (doesn't restart timer)
        if (maxSlotRef.current && nextSlot > maxSlotRef.current) {
          console.log('Reached max slot, pausing at:', currentSlot);
          return current; // Don't advance
        }

        const newValue = current + 1;
        console.log('TIMER ADVANCE (initial):', {
          initialSafeSlot: initialSafeSlotRef.current,
          currentSlotsAdvanced: current,
          nextSlotsAdvanced: newValue,
          currentSlot,
          nextSlot,
        });
        lastAdvanceTimeRef.current = Date.now();
        slotsAdvancedRef.current = newValue;
        return newValue;
      });

      // Now start the regular interval, aligned with slot boundaries
      const timer = setInterval(() => {
        const now = Date.now();

        // Skip if not ready
        if (initialSafeSlotRef.current === null) {
          console.log(`Timer ${timerId} fired but initialSafeSlot not ready yet`);
          return;
        }

        // Protect against double-firing (React StrictMode can cause this)
        if (now - lastAdvanceTimeRef.current < 11000) {
          console.log(
            `Timer ${timerId} skipping duplicate fire (last was ${now - lastAdvanceTimeRef.current}ms ago)`,
          );
          return;
        }

        console.log(`Timer ${timerId} firing at`, new Date().toISOString());
        setSlotsAdvanced(current => {
          if (initialSafeSlotRef.current === null) return current;

          const currentSlot = initialSafeSlotRef.current + current;
          const nextSlot = currentSlot + 1;

          // Check against current maxSlot using ref (doesn't restart timer)
          if (maxSlotRef.current && nextSlot > maxSlotRef.current) {
            console.log('Reached max slot, pausing at:', currentSlot);
            return current; // Don't advance
          }

          const newValue = current + 1;
          console.log('TIMER ADVANCE:', {
            initialSafeSlot: initialSafeSlotRef.current,
            currentSlotsAdvanced: current,
            nextSlotsAdvanced: newValue,
            currentSlot,
            nextSlot,
          });
          lastAdvanceTimeRef.current = now;
          slotsAdvancedRef.current = newValue; // Update the ref too
          return newValue;
        });
      }, 12000); // Every 12 seconds

      // Store interval ID for cleanup
      (window as any)[`timer_${timerId}`] = timer;
    }, msUntilNextSlot);

    return () => {
      console.log(`DESTROYING TIMER ${timerId} at`, new Date().toISOString());
      clearTimeout(initialTimeout);
      const timer = (window as any)[`timer_${timerId}`];
      if (timer) {
        clearInterval(timer);
        delete (window as any)[`timer_${timerId}`];
      }
    };
  }, [displaySlotOffset, clock]); // Depend on clock too

  // Calculate current slot: simple addition
  const baseSlot = initialSafeSlot !== null ? initialSafeSlot + slotsAdvanced : null;

  const slotNumber = baseSlot !== null ? baseSlot + displaySlotOffset : null;

  // Debug logging to track slot changes
  useEffect(() => {
    console.log('SLOT NUMBER CHANGED:', {
      slotNumber,
      initialSafeSlot,
      slotsAdvanced,
      displaySlotOffset,
      baseSlot,
      timestamp: new Date().toISOString(),
    });
  }, [slotNumber, initialSafeSlot, slotsAdvanced, displaySlotOffset, baseSlot]);

  // Track if a slot transition is in progress to prevent double transitions
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Define prefetch helpers with useCallback to avoid unnecessary recreations
  // Get the slot data store instance
  const slotDataStore = useMemo(() => SlotDataStore.getInstance(), []);

  // Enhanced data prefetching function with global storage
  const prefetchSlotData = React.useCallback(
    async (slotNumber: number | null, direction: 'next' | 'previous') => {
      if (slotNumber === null) return;

      // Don't prefetch negative slots
      if (slotNumber < 0) return;

      try {
        // Use React Query's prefetchQuery to actually trigger the fetch
        // This will use the same query function as useSlotData
        await queryClient.prefetchQuery({
          queryKey: ['slotData', selectedNetwork, slotNumber],
          queryFn: async () => {
            const client = await import('@/api').then(m => m.getRestApiClient());
            const api = await client;

            // Fetch all data sources in parallel
            const [
              blockResult,
              blockTimingResult,
              blobTimingResult,
              blobTotalResult,
              attestationTimingResult,
              attestationCorrectnessResult,
              proposerEntityResult,
              mevBlockResult,
              mevRelayResult,
              mevBuilderResult,
            ] = await Promise.allSettled([
              api.getBeaconBlock(selectedNetwork, slotNumber),
              api.getBeaconBlockTiming(selectedNetwork, slotNumber),
              api.getBeaconBlobTiming(selectedNetwork, slotNumber),
              api.getBeaconBlobTotal(selectedNetwork, slotNumber),
              api.getBeaconAttestationTiming(selectedNetwork, slotNumber),
              api.getBeaconAttestationCorrectness(selectedNetwork, slotNumber),
              api.getBeaconProposerEntity(selectedNetwork, slotNumber),
              api.getMevBlock(selectedNetwork, slotNumber),
              api.getMevRelayCount(selectedNetwork, slotNumber),
              api.getMevBuilderBid(selectedNetwork, slotNumber),
            ]);

            // Transform to BeaconSlotData format
            const { transformToBeaconSlotData } = await import('@/utils/slotDataTransformer');
            const slotData = transformToBeaconSlotData({
              network: selectedNetwork,
              slot: slotNumber,
              blockResult,
              blockTimingResult,
              blobTimingResult,
              blobTotalResult,
              attestationTimingResult,
              attestationCorrectnessResult,
              proposerEntityResult,
              mevBlockResult,
              mevRelayResult,
              mevBuilderResult,
            });

            return { data: slotData };
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
        });

        console.log(`[PREFETCH] Successfully prefetched slot ${slotNumber}`);
      } catch (error) {
        console.error(`[PREFETCH] Failed to prefetch data for slot ${slotNumber}:`, error);
      }
    },
    [selectedNetwork, queryClient],
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

  // Simple prefetching: prefetch next slot 8 seconds before we need it
  useEffect(() => {
    if (slotNumber === null || displaySlotOffset !== 0) return; // Only prefetch in live mode
    if (!selectedNetwork) return;

    // Set a timer for 4 seconds after slot starts (8 seconds before next slot)
    const timer = setTimeout(() => {
      const nextSlot = slotNumber + 1;

      // Check if next slot is within bounds before prefetching
      if (maxSlotRef.current && nextSlot <= maxSlotRef.current) {
        console.log(`[PREFETCH] Prefetching slot ${nextSlot} for ${selectedNetwork}`);
        prefetchNextSlotData(nextSlot);
      }
    }, 4000); // 4 seconds into the current slot

    return () => clearTimeout(timer);
  }, [slotNumber, displaySlotOffset, selectedNetwork, prefetchNextSlotData]);

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
  // We use isLive: false to prevent auto-refetching since we're manually prefetching
  const { data: slotData, isLoading: isSlotLoading } = useSlotData({
    network: selectedNetwork,
    slot: slotNumber || undefined,
    isLive: false, // Disable auto-refetch, we're handling prefetching manually
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
      {/* Wrap with TimelineProvider - pass explicit slot to prevent wallclock jumping */}
      <TimelineProvider
        network={selectedNetwork}
        slotOffset={displaySlotOffset}
        explicitSlot={slotNumber}
      >
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
