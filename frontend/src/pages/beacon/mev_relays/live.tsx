import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import { MevBidsVisualizer } from '../../../components/beacon/mev_relays/MevBidsVisualizer';
import { BidsTable } from '../../../components/beacon/mev_relays/BidsTable';
import { SlotOverview } from '../../../components/beacon/mev_relays/SlotOverview';
import { TimingsView } from '../../../components/beacon/mev_relays/TimingsView';
import { BeaconClockManager } from '../../../utils/beacon';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { NetworkContext } from '@/App';
import { TabButton } from '@/components/common/TabButton';

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


export default function MevRelaysLivePage() {
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
  const [activeTab, setActiveTab] = useState<string>('overview'); // State for bottom panel tabs

  const baseSlot = headSlot ? headSlot - headLagSlots : null;
  const slotNumber = baseSlot !== null ? baseSlot + displaySlotOffset : null;

  const labApiClient = getLabApiClient();

  const { data: slotData, isLoading: isSlotLoading, error: slotError } = useQuery({
    queryKey: ['mev-relays-live', 'slot', selectedNetwork, slotNumber],
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
    if (!slotData?.relayBids || !slotData?.block?.executionPayloadBlockHash) return null;

    for (const [relayName, relayData] of Object.entries(slotData.relayBids)) {
      const matchingBid = relayData.bids.find(bid =>
        bid.blockHash === slotData.block?.executionPayloadBlockHash
      );

      if (matchingBid) {
        try {
          const valueInEth = Number(BigInt(matchingBid.value)) / 1e18;
          return {
            blockHash: matchingBid.blockHash,
            value: valueInEth,
            relayName: relayName,
            builderPubkey: matchingBid.builderPubkey,
          };
        } catch { return null; }
      }
    }
    return null;
  }, [slotData?.relayBids, slotData?.block?.executionPayloadBlockHash]);

  const transformedBids = useMemo(() => {
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

  // --- End Data Transformation ---

  // Navigation and Playback functions
  const goToPreviousSlot = () => setDisplaySlotOffset(prev => prev - 1);
  const goToNextSlot = () => setDisplaySlotOffset(prev => prev + 1);
  const resetToCurrentSlot = () => setDisplaySlotOffset(0);
  const isNextDisabled = displaySlotOffset >= 0;
  const togglePlayPause = () => setIsPlaying(prev => !prev);

  return (
    <div className="flex flex-col h-full">
      {/* Top Controls Area */}
      <div className="flex items-center justify-between p-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousSlot}
            className="bg-surface p-2 rounded-lg border border-subtle hover:bg-hover transition"
            title="Previous Slot"
          >
            <ChevronLeft className="h-4 w-4 text-primary" />
          </button>

          <button
            onClick={resetToCurrentSlot}
            className={`px-3 py-1.5 rounded-lg border font-medium text-xs ${displaySlotOffset === 0
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'bg-surface border-subtle text-secondary hover:bg-hover'
              } transition`}
            disabled={displaySlotOffset === 0}
            title="Return to Current Slot"
          >
            Live Slot
          </button>

          <button
            onClick={goToNextSlot}
            className={`bg-surface p-2 rounded-lg border border-subtle transition ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
              }`}
            disabled={isNextDisabled}
            title="Next Slot"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>

          <div className="text-sm font-mono ml-2 text-primary">
            Slot: {slotNumber ?? "—"}
            {headSlot !== null && slotNumber !== null && displaySlotOffset !== 0 && (
              <span className="ml-2 text-xs text-secondary opacity-70">
                (Lag: {headLagSlots - displaySlotOffset} slots)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={togglePlayPause}
          className="bg-surface p-2 rounded-lg border border-subtle hover:bg-hover transition"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary" />}
        </button>
      </div>

      {/* Main Content Area (Visualization) */}
      <div className="flex-1 p-4 min-h-0">
        {isSlotLoading && !slotData && <div className="text-center p-8 text-secondary">Loading slot data...</div>}
        {slotError && <div className="text-center p-8 text-error">Error loading slot data: {slotError.message}</div>}
        {!isSlotLoading && !slotData && slotNumber !== null && <div className="text-center p-8 text-secondary">No data available for slot {slotNumber}.</div>}

        {slotData && (
          <MevBidsVisualizer
            bids={transformedBids}
            currentTime={currentTime}
            relayColors={relayColors}
            winningBid={winningBidData}
            timeRange={timeRange}
            valueRange={valueRange}
            height={400} // Adjust height as needed
          />
        )}
      </div>

      {/* Bottom Panel Area */}
      <div className="border-t border-subtle bg-surface/50 backdrop-blur-sm p-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <TabButton
            label="Slot Overview"
            isActive={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <TabButton
            label={`Bids (${totalBids})`}
            isActive={activeTab === 'bids'}
            onClick={() => setActiveTab('bids')}
          />
          <TabButton
            label="Timings"
            isActive={activeTab === 'timings'}
            onClick={() => setActiveTab('timings')}
          />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
          {activeTab === 'overview' && (
            <SlotOverview
              slot={slotNumber || undefined}
              proposer={slotData?.proposer}
              block={slotData?.block}
              winningBid={winningBidData}
              relayColors={relayColors}
            />
          )}

          {activeTab === 'bids' && (
            <BidsTable
              bids={transformedBids}
              relayColors={relayColors}
            />
          )}

          {activeTab === 'timings' && (
            <TimingsView
              bids={transformedBids}
              relayColors={relayColors}
            />
          )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}