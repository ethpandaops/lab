import React, { useMemo, useState, useEffect } from 'react';
import { BeaconSlotData } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { motion } from 'framer-motion';
import { Layers, Zap, Award, DollarSign, Star } from 'lucide-react';
import clsx from 'clsx';

// Helper: Convert Wei string to ETH number
const weiToEth = (wei: string | undefined): number => {
  if (!wei) return 0;
  try {
    const weiBigInt = BigInt(wei);
    return Number(weiBigInt * 10000n / (10n**18n)) / 10000;
  } catch (error) {
    console.error("Error converting Wei to ETH:", error);
    return 0;
  }
};

interface BidInfo {
  relay: string;
  value: number; // in ETH
  time: number; // ms within slot
  isWinning: boolean;
}

interface BlocksVisualizationProps {
  slotData: BeaconSlotData | null | undefined;
  currentTime: number; // 0-12000ms
  slotNumber: number | null;
}

const BlocksVisualization: React.FC<BlocksVisualizationProps> = ({
  slotData,
  currentTime,
  slotNumber
}) => {
  // Track if we've shown the winning animation
  const [hasShownWinningAnimation, setHasShownWinningAnimation] = useState(false);
  
  // Process bids for the current slot
  const bids = useMemo(() => {
    if (!slotData?.relayBids) return [];
    
    const result: BidInfo[] = [];
    
    // Find the winning bid if there is a delivered payload
    let winningBlockHash: string | undefined;
    
    if (slotData.deliveredPayloads) {
      // Look through all delivered payloads
      Object.values(slotData.deliveredPayloads).forEach(payloads => {
        if (payloads.payloads?.length > 0) {
          winningBlockHash = payloads.payloads[0].blockHash;
        }
      });
    }
    
    // Process all bids
    Object.entries(slotData.relayBids).forEach(([relay, relayBids]) => {
      relayBids.bids.forEach(bid => {
        if (bid.slotTime <= currentTime) { // Only show bids up to current time
          result.push({
            relay,
            value: weiToEth(bid.value),
            time: bid.slotTime ?? 0,
            isWinning: !!winningBlockHash && bid.blockHash === winningBlockHash
          });
        }
      });
    });
    
    // Sort by value (highest first)
    return result.sort((a, b) => b.value - a.value);
  }, [slotData, currentTime]);
  
  // Show winning animation when reaching a certain time
  useEffect(() => {
    if (currentTime >= 4000 && bids.some(b => b.isWinning) && !hasShownWinningAnimation) {
      setHasShownWinningAnimation(true);
    }
  }, [currentTime, bids, hasShownWinningAnimation]);
  
  // Assign colors to relays consistently
  const relayColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorOptions = [
      'bg-gradient-to-br from-red-500 to-red-700',
      'bg-gradient-to-br from-blue-500 to-blue-700',
      'bg-gradient-to-br from-green-500 to-green-700',
      'bg-gradient-to-br from-yellow-500 to-yellow-700',
      'bg-gradient-to-br from-purple-500 to-purple-700',
      'bg-gradient-to-br from-pink-500 to-pink-700',
      'bg-gradient-to-br from-indigo-500 to-indigo-700',
      'bg-gradient-to-br from-cyan-500 to-cyan-700',
    ];
    
    if (slotData?.relayBids) {
      Object.keys(slotData.relayBids).forEach((relay, index) => {
        colors[relay] = colorOptions[index % colorOptions.length];
      });
    }
    
    return colors;
  }, [slotData]);
  
  // No data to show
  if (!slotData || bids.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800">
        <p className="text-gray-400 text-center">
          No blocks or bids to visualize
          <br />
          <span className="text-sm opacity-60">Waiting for data...</span>
        </p>
      </div>
    );
  }
  
  // Find the highest bid for emphasis
  const highestBid = bids[0]; // Already sorted
  
  // Find winning bid if present
  const winningBid = bids.find(b => b.isWinning);

  return (
    <div className="relative h-80 overflow-hidden bg-gray-900/70 rounded-xl border border-gray-800 p-2">
      {/* Progress bar along top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
        <div 
          className="h-full bg-purple-500"
          style={{ width: `${(currentTime / 12000) * 100}%`, transition: 'width 100ms linear' }}
        />
      </div>
      
      {/* Title and slot info */}
      <div className="text-center mb-4 pt-2">
        <h3 className="text-lg font-bold text-white">
          <Layers className="inline-block mr-2 w-5 h-5 text-purple-400" />
          Block Building Arena
        </h3>
        <p className="text-gray-400 text-sm">
          Slot {slotNumber} - Time: {(currentTime / 1000).toFixed(1)}s
        </p>
      </div>
      
      {/* Floor/ground effect */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-gray-950 to-transparent" />
      
      {/* Physical blocks */}
      <div className="relative h-full flex items-end justify-center pb-12">
        {bids.slice(0, 5).map((bid, index) => {
          // Calculate position based on index
          const posX = 50 + (index - 2) * 20; // Center around 50%
          const initialY = 110; // Start below the visible area
          
          // Calculate size based on bid value relative to highest bid
          const baseSize = 70;
          const valueFactor = bid.value / highestBid.value;
          const size = Math.max(40, baseSize * valueFactor);
          
          // Special effects for winning bid
          const isWinner = bid.isWinning;
          
          return (
            <motion.div
              key={`${bid.relay}-${bid.time}-${index}`}
              className="absolute"
              style={{ left: `${posX}%`, bottom: '0%' }}
              initial={{ y: initialY, opacity: 0, scale: 0.5 }}
              animate={{ 
                y: 0, 
                opacity: 1, 
                scale: isWinner && hasShownWinningAnimation ? [1, 1.1, 1] : 1,
                rotate: isWinner && hasShownWinningAnimation ? [0, -5, 5, 0] : 0
              }}
              transition={{ 
                type: 'spring', 
                damping: 12, 
                delay: index * 0.1,
                duration: 0.8
              }}
            >
              <div className={clsx(
                "relative flex flex-col items-center justify-center",
                "transition-all duration-300 shadow-lg",
                relayColors[bid.relay] || 'bg-gradient-to-br from-gray-600 to-gray-800',
                isWinner ? 'ring-4 ring-yellow-400 shadow-yellow-400/30' : ''
              )} 
              style={{ 
                width: `${size}px`, 
                height: `${size}px`,
                transform: `perspective(400px) rotateX(10deg)`,
                boxShadow: `0 ${size/4}px ${size/2}px rgba(0,0,0,0.5)`
              }}>
                {/* Top face highlight */}
                <div className="absolute inset-0 bg-white/20 rounded-sm" 
                  style={{ clipPath: 'polygon(0 0, 100% 0, 80% 20%, 20% 20%)' }} />
                
                {/* Value display */}
                <div className="font-bold text-white text-sm">
                  {bid.value.toFixed(4)}
                </div>
                <div className="text-white/80 text-xs">ETH</div>
                
                {/* Relay name */}
                <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-300 whitespace-nowrap">
                  {bid.relay}
                </div>
                
                {/* Winner crown */}
                {isWinner && (
                  <motion.div 
                    className="absolute -top-6"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Award className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                  </motion.div>
                )}
                
                {/* Price tag for highest non-winning bid */}
                {bid === highestBid && !isWinner && (
                  <div className="absolute -top-6">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Winning animation effects */}
      {winningBid && hasShownWinningAnimation && (
        <>
          <motion.div 
            className="absolute inset-0 bg-yellow-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* Celebration particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                zIndex: 20
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                x: [0, (Math.random() - 0.5) * 100],
                y: [0, (Math.random() - 0.5) * 100],
              }}
              transition={{ duration: 2, delay: i * 0.1 }}
            >
              <Star className="h-3 w-3 text-yellow-400" />
            </motion.div>
          ))}
        </>
      )}
      
      {/* Bid info panel */}
      <div className="absolute bottom-1 right-1 bg-gray-900/80 p-2 rounded-md border border-gray-800">
        <div className="text-xs text-gray-400">
          <div className="font-semibold text-white flex items-center">
            <Zap className="h-3 w-3 mr-1 text-yellow-400" />
            Bids: {bids.length}
          </div>
          {bids.length > 0 && (
            <div className="text-green-400">
              Highest: {highestBid.value.toFixed(4)} ETH
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlocksVisualization; 