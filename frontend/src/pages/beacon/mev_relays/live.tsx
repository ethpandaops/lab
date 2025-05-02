import React, { useState, useEffect, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { useParams } from 'react-router-dom'; // Uncomment if network comes from URL params
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import { BeaconSlotData } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb.js'; // Import from correct source
// import LoadingOrError from '../../../components/LoadingOrError'; // Removed unused import
import { Card, CardBody } from '../../../components/common/Card'; // Import Card components
import { MevSlotDetailView } from '../../../components/beacon/mev_relays'; // Added import
import { BeaconClockManager } from '../../../utils/beacon'; // Add BeaconClockManager import
import BidsChart from '../../../components/beacon/mev_relays/BidsChart';
import BlocksVisualization from '../../../components/beacon/mev_relays/BlocksVisualization';
import { Zap, TrendingUp, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { NetworkContext } from '@/App';

const LiveMev: React.FC = () => {
  // Get the selected network from context
  const { selectedNetwork } = useContext(NetworkContext);
  
  const beaconClockManager = BeaconClockManager.getInstance();
  const clock = beaconClockManager.getBeaconClock(selectedNetwork);
  
  // Get the configurable head lag slots
  const headLagSlots = beaconClockManager.getHeadLagSlots(selectedNetwork);
  
  // Calculate the display slot by applying the head lag
  const headSlot = clock ? clock.getCurrentSlot() : null;
  
  // State to track the currently displayed slot
  const [displaySlotOffset, setDisplaySlotOffset] = useState<number>(0);
  
  // Calculate the actual slot to display based on head slot, lag, and user selection
  const baseSlot = headSlot ? headSlot - headLagSlots : null;
  const slotNumber = baseSlot ? baseSlot + displaySlotOffset : null;
  
  const [currentTime, setCurrentTime] = useState<number>(0);

  const labApiClient = getLabApiClient();

  const { data: slotData, isLoading: isSlotLoading, error: slotError } = useQuery({
    queryKey: ['mev-relays-live', 'slot', selectedNetwork, slotNumber],
    queryFn: async () => {
      if (!slotNumber) return null;
      const client = await labApiClient;
      const req = new GetSlotDataRequest({
        network: selectedNetwork,
        slot: BigInt(slotNumber),
      });
      const res = await client.getSlotData(req);
      return res.data;
    },
    refetchInterval: 5000,
    enabled: !!slotNumber,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (clock && slotNumber) {
        // Calculate milliseconds into the current slot
        const now = Math.floor(Date.now() / 1000);
        
        // For the target slot, we want to show the slot progression from 0-12 seconds
        // based on the current time of day. This gives a smooth animation effect
        // that stays synchronized with the wall clock, just offset by the lag slots.
        const slotTimeInSeconds = now % 12; // Time of day modulo 12 seconds per slot
        const msIntoSlot = slotTimeInSeconds * 1000;
        
        setCurrentTime(msIntoSlot);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [clock, slotNumber]);

  // Helper function: Get the highest bid value
  const getHighestBidValue = (slotData: BeaconSlotData | null | undefined): { value: string; relay: string } | null => {
    if (!slotData?.relayBids) return null;
    
    let highestBid: { value: string; relay: string } | null = null;
    
    Object.entries(slotData.relayBids).forEach(([relay, relayBids]) => {
      if (relayBids && relayBids.bids) {
        relayBids.bids.forEach(bid => {
          if (!highestBid || (bid.value && BigInt(bid.value) > BigInt(highestBid.value))) {
            highestBid = { value: bid.value || '0', relay };
          }
        });
      }
    });
    
    return highestBid;
  };

  // Get stats for the hero section
  const highestBid = getHighestBidValue(slotData);
  const formattedEth = highestBid ? formatEth(highestBid.value) : '0.0000';
  
  // Helper to convert wei to ETH
  function formatEth(wei: string): string {
    try {
      const valueInWei = BigInt(wei);
      const valueInEth = Number(valueInWei) / 1e18;
      return valueInEth.toFixed(4);
    } catch {
      return '0.0000';
    }
  }

  // Count total bids for the slot
  const totalBids = !slotData?.relayBids 
    ? 0 
    : Object.values(slotData.relayBids).reduce((sum, relayBids) => {
        return sum + (relayBids.bids?.length || 0);
      }, 0);

  // Navigation functions
  const goToPreviousSlot = () => {
    setDisplaySlotOffset(prev => prev - 1);
  };

  const goToNextSlot = () => {
    setDisplaySlotOffset(prev => prev + 1);
  };

  const resetToCurrentSlot = () => {
    setDisplaySlotOffset(0);
  };

  // Determine if next button should be disabled (don't allow going past latest slot)
  const isNextDisabled = displaySlotOffset >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section with Slot Navigation */}
      <motion.div 
        className="relative overflow-hidden bg-gray-900/70 rounded-xl border border-gray-800 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 
          mix-blend-overlay" />
        
        <div className="relative p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-400" />
                Block Building Arena
              </h1>
              <p className="text-gray-400 mt-1">
                Watch relays compete in real-time with their best bids for inclusion on {selectedNetwork}
                {headSlot && slotNumber && (
                  <span className="ml-2 text-xs opacity-70">
                    (Head: {headSlot}, Showing: {slotNumber}, Lag: {headLagSlots - displaySlotOffset} slots)
                  </span>
                )}
              </p>
            </motion.div>

            {/* Slot Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousSlot}
                className="bg-gray-800/70 p-2 rounded-lg border border-gray-700 hover:bg-gray-700/70 transition"
                title="Previous Slot"
              >
                <ChevronLeft className="h-4 w-4 text-gray-300" />
              </button>
              
              <button
                onClick={resetToCurrentSlot}
                className={`px-3 py-1.5 rounded-lg border font-medium text-sm ${
                  displaySlotOffset === 0 
                    ? 'bg-purple-800/50 border-purple-500/50 text-purple-200' 
                    : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:bg-gray-700/70'
                } transition`}
                disabled={displaySlotOffset === 0}
                title="Return to Current Slot"
              >
                Current Slot
              </button>
              
              <button
                onClick={goToNextSlot}
                className={`bg-gray-800/70 p-2 rounded-lg border border-gray-700 transition ${
                  isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700/70'
                }`}
                disabled={isNextDisabled}
                title="Next Slot"
              >
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
              
              <div className="text-sm font-mono ml-2 text-white">
                Slot: {slotNumber || "—"}
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <motion.div 
                className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <div className="text-sm font-medium text-gray-400">Total Bids</div>
                <div className="mt-1 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="text-xl font-bold text-white">{totalBids}</span>
                </div>
              </motion.div>
              
              <motion.div 
                className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <div className="text-sm font-medium text-gray-400">Top Bid</div>
                <div className="mt-1 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <span className="text-xl font-bold text-white">
                    {formattedEth} ETH
                    {highestBid && <span className="text-xs ml-1 text-gray-400">by {highestBid.relay}</span>}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <motion.div
              className="rounded-lg overflow-hidden bg-gray-800/30 border border-gray-700"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <BlocksVisualization 
                slotData={slotData || null} 
                currentTime={currentTime}
                slotNumber={slotNumber}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bids Chart - 2/3 width on large screens */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardBody>
            <BidsChart 
              currentSlotData={slotData}
              currentTime={currentTime}
              currentSlotNumber={slotNumber}
            />
          </CardBody>
        </Card>

        {/* Slot Detail Card */}
        <MevSlotDetailView 
          slotData={slotData || null}
          slotNumber={slotNumber}
          currentTime={currentTime}
          isCurrentSlot={displaySlotOffset === 0}
          isLoading={isSlotLoading}
          error={slotError}
        />
      </div>
    </div>
  );
};

export default function Live() {
  return <LiveMev />;
}