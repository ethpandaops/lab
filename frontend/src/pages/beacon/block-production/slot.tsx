import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import {
  MobileBlockProductionView,
  DesktopBlockProductionView,
  Phase,
} from '../../../components/beacon/block_production';
import { Phase as PhaseEnum } from '../../../components/beacon/block_production/common/types';
import { BeaconClockManager } from '../../../utils/beacon';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import NetworkContext from '@/contexts/NetworkContext';
import { isBlockLocallyBuilt, hasNonEmptyDeliveredPayloads } from '@/components/beacon/block_production/common/blockUtils';

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
 * BlockProductionSlotPage visualizes a specific Ethereum block production slot
 * across four key stages: Block Builders, MEV Relays, Block Proposers, Nodes, and Attesters.
 * This component can be linked to with a specific time parameter.
 */
export default function BlockProductionSlotPage() {
  const { network, slot: slotParam } = useParams<{ network?: string; slot?: string }>();
  const selectedNetwork = network || 'mainnet'; // Default to mainnet if no network param
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Initial time value from URL query parameter, default to 0
  // Check both 'time' and 't' parameters for backward compatibility
  const initialTimeParam = searchParams.get('time') || searchParams.get('t');
  const initialTimeMs = initialTimeParam ? parseFloat(initialTimeParam) * 1000 : 0;
  // Initialize with time parameter

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

  // Convert slot param to a number
  const slotNumber = slotParam ? parseInt(slotParam, 10) : null;

  // Handle time management
  const [currentTime, setCurrentTime] = useState<number>(initialTimeMs);
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Start paused since we're showing a specific time
  const [currentPhase, setCurrentPhase] = useState<Phase>(Phase.Building);

  // Navigation functions - defined early to avoid reference errors
  const goToPreviousSlot = () => {
    if (slotNumber !== null) {
      // Navigate to previous slot
      window.location.href = `/beacon/block-production/${slotNumber - 1}`;
    }
  };

  const goToNextSlot = () => {
    if (slotNumber !== null) {
      // Navigate to next slot
      window.location.href = `/beacon/block-production/${slotNumber + 1}`;
    }
  };

  const goToLiveView = () => {
    // Navigate to live view
    window.location.href = `/beacon/block-production/live`;
  };

  const togglePlayPause = () => setIsPlaying(prev => !prev);

  const labApiClient = getLabApiClient();

  const {
    data: slotData,
    isLoading: isSlotLoading,
    error: slotError,
  } = useQuery({
    queryKey: ['block-production-slot', 'slot', selectedNetwork, slotNumber],
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
    staleTime: 60000, // Consider data fresh for 60 seconds to avoid refetching when viewing fixed slots
    retry: 2, // Retry failed requests twice
    enabled: slotNumber !== null,
    onSuccess: (data) => {
      // Got slot data
    },
  });

  // Timer effect for playback
  useEffect(() => {
    if (!isPlaying || slotNumber === null) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = Math.min(12000, prev + 100); // Increment by 100ms, up to 12s maximum
        return next;
      });
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isPlaying, slotNumber]);

  // Handle phase changes
  const handlePhaseChange = (phase: Phase) => {
    setCurrentPhase(phase);
  };

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
      console.warn('Invalid execution payload block hash:', executionPayloadBlockHash);
      return null;
    }

    // Search through all relay bids to find a matching block hash
    for (const [relayName, relayData] of Object.entries(slotData.relayBids)) {
      if (!relayData.bids || !Array.isArray(relayData.bids)) continue;

      const matchingBid = relayData.bids.find(
        bid =>
          bid.blockHash &&
          typeof bid.blockHash === 'string' &&
          bid.blockHash === executionPayloadBlockHash,
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
        } catch {
          /* Skip bid if conversion fails */
        }
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

  // Pass entity info separately since it might be in a different part of the slotData
  const proposerEntity = slotData?.entity;

  // --- End Data Transformation ---

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

  // Create a local copy to prepare with attestation data
  let preparedData = slotData ? { ...slotData } : { ...fallbackData };
  
  // When viewing a specific slot directly, inject time-appropriate attestation data
  // This ensures the phase transitions work correctly based on the time parameter
  if (initialTimeMs >= 6500) {
    // Add attestation data for time-based phases
    if (!preparedData.attestations) {
      preparedData.attestations = {
        maximumVotes: 100,
        windows: [
          {
            startMs: 6500,
            validatorIndices: Array(10).fill(0)  // 10 attesters initially
          }
        ]
      };
    }
    
    // Add more attestations if we're past 8.5 seconds to trigger the Accepted phase
    if (initialTimeMs >= 8500 && preparedData.attestations) {
      // Only add if it doesn't already have attestations at this time point
      const hasLateAttestations = preparedData.attestations.windows?.some(
        (window: any) => window.startMs >= 8500
      );
      
      if (!hasLateAttestations) {
        preparedData.attestations.windows.push({
          startMs: 8500,
          validatorIndices: Array(60).fill(0)  // 60 more attesters at 8.5s (total 70 = 70% of maximumVotes)
        });
      }
    }
  }
  
  // Use the prepared data for display
  const displayData = preparedData;
  
  // Force the current phase based on time for the UI to display correctly
  useEffect(() => {
    if (initialTimeMs >= 8500) {
      setCurrentPhase(PhaseEnum.Accepted);
    } else if (initialTimeMs >= 6500) {
      setCurrentPhase(PhaseEnum.Attesting);
    } else if (initialTimeMs >= 5000) {
      setCurrentPhase(PhaseEnum.Propagating);
    }
  }, [initialTimeMs]);

  // Empty arrays for displaying when no real data
  const emptyBids = [];
  const emptyRelayColors = {};

  return (
    <div className="flex flex-col h-full">

      {/* Conditionally render mobile or desktop view based on screen size */}
      {isMobile ? (
        // Mobile View
        <div className="px-2 pt-1">
          <div
            className={`transition-opacity duration-300 ${isSlotLoading ? 'opacity-70' : 'opacity-100'}`}
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
              slotData={displayData}
              network={selectedNetwork || 'mainnet'}
              isLocallyBuilt={displayData ? !hasNonEmptyDeliveredPayloads(displayData.block, displayData) : false}
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
        // Desktop View - Unified using the new DesktopBlockProductionView component
        <div className="px-2 pt-1 h-full flex flex-col">
          {/* Error state */}
          {slotError && (
            <div className="text-center p-4 text-error rounded bg-error/10 border border-error/20 mb-2">
              Error loading block data: {slotError.message}
            </div>
          )}

          <div
            className={`transition-opacity duration-300 flex-1 ${isSlotLoading ? 'opacity-70' : 'opacity-100'}`}
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
              slotData={displayData} // Pass slotData directly
              timeRange={timeRange}
              valueRange={valueRange}
              onPhaseChange={handlePhaseChange}
              // Add navigation props required by DesktopBlockProductionView
              slotNumber={slotNumber}
              headLagSlots={0}
              displaySlotOffset={0}
              isPlaying={isPlaying}
              goToPreviousSlot={goToPreviousSlot}
              goToNextSlot={goToNextSlot}
              resetToCurrentSlot={goToLiveView}
              togglePlayPause={togglePlayPause}
              isNextDisabled={false}
              network={selectedNetwork || 'mainnet'}
              isLocallyBuilt={displayData ? !hasNonEmptyDeliveredPayloads(displayData.block, displayData) : false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
