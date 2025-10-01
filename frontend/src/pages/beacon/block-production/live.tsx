import React, { useState, useEffect, useMemo } from 'react';
import useBeacon from '@/contexts/beacon';
import { useSlotData } from '@/hooks/useSlotData';
import { useSlotState, useSlotConfig, useSlotActions } from '@/hooks/useSlot';
import { useDebugSection } from '@/hooks/useDebugSection';
import { useNetwork } from '@/stores/appStore';
import {
  MobileBlockProductionView,
  DesktopBlockProductionView,
  generateConsistentColor,
  BidData,
} from '@/components/beacon/block_production';
import { hasNonEmptyDeliveredPayloads } from '@/components/beacon/block_production/common/blockUtils';

/**
 * BlockProductionLivePage visualizes the entire Ethereum block production process
 * across four key stages: Block Builders, MEV Relays, Block Proposers, and Network Nodes.
 * The visualization tracks the flow of blocks through the system in real-time.
 */
function BlockProductionLivePage() {
  // Use network directly from NetworkContext
  const { selectedNetwork } = useNetwork();

  // Use centralized slot management
  const { currentSlot, isPlaying, mode } = useSlotState();
  const { minSlot, maxSlot } = useSlotConfig();
  const actions = useSlotActions();

  // Use current slot directly without lag
  const displaySlot = currentSlot;

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

  const { getBeaconClock } = useBeacon();
  const clock = getBeaconClock(selectedNetwork);

  // Check if we can navigate forward - disable when currentSlot can't advance further
  const isNextDisabled = currentSlot >= maxSlot;

  // Use slot data for current display slot with prefetch at 8 seconds
  const { data: slotData, isLoading: isSlotLoading } = useSlotData({
    network: selectedNetwork,
    slot: displaySlot !== null && displaySlot >= 0 ? displaySlot : undefined,
    enabled: displaySlot !== null && displaySlot >= 0,
    prefetchNext: true, // Enable prefetch at 8s mark for smooth transitions
    prefetchAt: 8000, // Trigger prefetch at 8000ms into the slot
  });

  // Also fetch previous slot data for the blockchain visualization
  const { data: prevSlotData } = useSlotData({
    network: selectedNetwork,
    slot: displaySlot !== null ? displaySlot - 1 : undefined,
    enabled: displaySlot !== null && displaySlot > 0,
  });

  // Build combined slot data map for blockchain visualization
  const slotDataCache = useMemo(() => {
    const cache: Record<number, any> = {};
    if (displaySlot !== null && slotData) {
      cache[displaySlot] = slotData;
    }
    if (displaySlot !== null && prevSlotData && displaySlot > 0) {
      cache[displaySlot - 1] = prevSlotData;
    }
    return cache;
  }, [displaySlot, slotData, prevSlotData]);

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

  // Register debug section for block production navigation
  useDebugSection(
    'block-production-nav',
    'Block Production Navigation',
    () => {
      const lagFromHead = maxSlot - currentSlot;
      const canNavigateForward = !isNextDisabled;
      const slotsUntilMax = maxSlot - currentSlot;

      return (
        <div className="font-mono text-xs space-y-3">
          {/* Visualization State */}
          <div>
            <div className="text-orange-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
              Visualization State
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-2">
              <div>
                <span className="text-tertiary">Display:</span>{' '}
                <span className="text-primary font-semibold">{displaySlot ?? 'null'}</span>
              </div>
              <div>
                <span className="text-tertiary">Current:</span>{' '}
                <span className="text-primary">{currentSlot}</span>
              </div>
              <div className="col-span-2 text-[10px] text-blue-400">
                Display slot: {displaySlot} (same as current slot)
              </div>
            </div>
          </div>

          {/* Navigation Boundaries */}
          <div>
            <div className="text-purple-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
              Navigation Boundaries
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-2">
              <div>
                <span className="text-tertiary">Max:</span>{' '}
                <span className="text-primary">{maxSlot}</span>
              </div>
              <div>
                <span className="text-tertiary">Behind Head:</span>{' '}
                <span className={lagFromHead > 0 ? 'text-yellow-400' : 'text-green-400'}>
                  {lagFromHead} slots
                </span>
              </div>
              <div className="col-span-2 mt-1">
                <span className="text-tertiary">Until Max:</span>{' '}
                <span className="text-primary text-[10px]">{slotsUntilMax} slots remaining</span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div>
            <div className="text-cyan-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
              Navigation Controls
            </div>
            <div className="pl-2 space-y-1">
              <div>
                <span className="text-tertiary">Next Button:</span>{' '}
                {canNavigateForward ? (
                  <span className="text-green-500">✓ Enabled</span>
                ) : (
                  <span className="text-red-500">✗ Disabled</span>
                )}
              </div>
              <div className="text-[10px] text-gray-400">
                Condition: currentSlot ({currentSlot}) {'>='} maxSlot ({maxSlot}) ={' '}
                {String(!canNavigateForward)}
              </div>
              <div className="text-[10px] text-yellow-300">Disables at: Slot {maxSlot}</div>
            </div>
          </div>
        </div>
      );
    },
    [currentSlot, displaySlot, maxSlot, isNextDisabled],
    10, // Priority - show this early
  );

  return (
    <div className="flex flex-col h-full bg-base">
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
              slot={displaySlot !== null && displaySlot >= 0 ? displaySlot : undefined}
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
              slotNumber={displaySlot}
              headLagSlots={0} // Already accounted for in displaySlot
              displaySlotOffset={displaySlot - currentSlot}
              goToPreviousSlot={actions.previousSlot}
              goToNextSlot={actions.nextSlot}
              resetToCurrentSlot={() => actions.jumpToLive()}
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
              slot={displaySlot !== null && displaySlot >= 0 ? displaySlot : undefined}
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
              slotNumber={displaySlot}
              headLagSlots={0} // Already accounted for in displaySlot
              displaySlotOffset={displaySlot - currentSlot}
              goToPreviousSlot={actions.previousSlot}
              goToNextSlot={actions.nextSlot}
              resetToCurrentSlot={() => actions.jumpToLive()}
              isNextDisabled={isNextDisabled}
              network={selectedNetwork}
              isLocallyBuilt={isLocallyBuilt}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default BlockProductionLivePage;
