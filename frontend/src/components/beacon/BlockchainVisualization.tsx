import React, { useMemo } from 'react';
import { truncateMiddle } from '@/components/beacon/block_production/common/utils';
import SlotDataStore from '@/utils/SlotDataStore';
import { getCurrentPhase } from '@/components/beacon/block_production/common/PhaseUtils';
import { Phase } from '@/components/beacon/block_production/common/types';

// Define types for our component props
interface BlockchainVisualizationProps {
  currentSlot: number | null;
  network: string;
  currentTime: number;
  nodeBlockSeen?: Record<string, number>;
  nodeBlockP2P?: Record<string, number>;
  blockTime?: number;
  height?: string | number;
  width?: string | number;
  className?: string;
}

// Type for block data display
interface BlockDisplayData {
  slot: number;
  blockHash?: string;
  executionBlockNumber?: number;
  transactionCount?: number;
  blobCount?: number;
  blockValue?: number;
  proposerEntity?: string;
  gasUsed?: number;
  gasLimit?: number;
  isCurrentSlot: boolean;
  isPast: boolean;
  isFuture: boolean;
  hasData: boolean;
  isBuilding: boolean;
  futureBidsCount?: number;
  futureBids?: Array<{
    value: number;
    relayName: string;
    builderName?: string;
  }>;
}

const BlockchainVisualization: React.FC<BlockchainVisualizationProps> = ({
  currentSlot,
  network,
  currentTime,
  nodeBlockSeen = {},
  nodeBlockP2P = {},
  blockTime,
  height = '100%',
  width = '100%',
  className = '',
}) => {
  // Determine the current phase using PhaseUtils
  const currentPhase = useMemo(() => {
    const phase = getCurrentPhase(
      currentTime,
      nodeBlockSeen,
      nodeBlockP2P,
      blockTime
    );
    
    // Debug logging to help troubleshoot phase changes
    console.debug('BlockchainVisualization - Current phase:', { 
      phase, 
      currentTime, 
      hasNodeData: Object.keys(nodeBlockSeen).length > 0 || Object.keys(nodeBlockP2P).length > 0,
      blockTime 
    });
    
    return phase;
  }, [currentTime, nodeBlockSeen, nodeBlockP2P, blockTime]);
  // Get the slot data store
  const slotDataStore = useMemo(() => SlotDataStore.getInstance(), []);

  // Calculate the slots to display: 2 previous, current, and 1 next
  const displaySlots = useMemo(() => {
    if (currentSlot === null) return [];
    
    return [
      currentSlot - 2, // -2 slots
      currentSlot - 1, // -1 slot
      currentSlot,     // Current slot
      currentSlot + 1, // Next slot
    ];
  }, [currentSlot]);

  // Format hash for display
  const formatHash = (hash?: string, startChars = 6, endChars = 4) => {
    if (!hash) return '—';
    if (hash.length <= startChars + endChars) return hash;
    return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
  };

  // Convert value to number safely
  const toNumber = (value?: string | number): number => {
    if (value === undefined || value === null) return 0;
    return typeof value === 'string' ? parseInt(value, 10) || 0 : value;
  };

  // Process data for each slot
  const blockData: BlockDisplayData[] = useMemo(() => {
    return displaySlots.map(slot => {
      const slotData = slotDataStore.getSlotData(network, slot);
      const isPast = slot < (currentSlot || 0);
      const isFuture = slot > (currentSlot || 0);
      const isCurrentSlot = slot === currentSlot;
      const hasData = !!slotData;
      
      // Determine if the block is in building phase based solely on the phase
      // Let PhaseUtils handle all the logic for determining the phase
      const isBuilding = isCurrentSlot && currentPhase === Phase.Building;

      // If we have data for this slot, extract relevant information
      if (slotData) {
        const block = slotData.block || {};
        
        // Extract blob count
        const blobGasUsed = typeof block.execution_payload_blob_gas_used !== 'undefined'
          ? Number(block.execution_payload_blob_gas_used)
          : typeof block.executionPayloadBlobGasUsed !== 'undefined'
            ? Number(block.executionPayloadBlobGasUsed)
            : 0;
        
        const blobCount = blobGasUsed > 0 
          ? Math.ceil(blobGasUsed / 131072) 
          : 0;
        
        // Extract execution block number
        const executionBlockNumber = typeof block.execution_payload_block_number !== 'undefined'
          ? Number(block.execution_payload_block_number)
          : typeof block.executionPayloadBlockNumber !== 'undefined'
            ? Number(block.executionPayloadBlockNumber)
            : undefined;
            
        // Extract transaction count
        const transactionCount = typeof block.execution_payload_transactions_count !== 'undefined'
          ? Number(block.execution_payload_transactions_count)
          : typeof block.executionPayloadTransactionsCount !== 'undefined'
            ? Number(block.executionPayloadTransactionsCount)
            : undefined;
            
        // Extract gas used
        const gasUsed = typeof block.execution_payload_gas_used !== 'undefined'
          ? Number(block.execution_payload_gas_used)
          : typeof block.executionPayloadGasUsed !== 'undefined'
            ? Number(block.executionPayloadGasUsed)
            : undefined;
            
        // Extract gas limit
        const gasLimit = typeof block.execution_payload_gas_limit !== 'undefined'
          ? Number(block.execution_payload_gas_limit)
          : typeof block.executionPayloadGasLimit !== 'undefined'
            ? Number(block.executionPayloadGasLimit)
            : undefined;
        
        // Get block hash
        const blockHash = block.blockRoot || block.block_root || block.executionPayloadBlockHash || block.execution_payload_block_hash;
        
        // Get block value from winning bid if available
        const winningBid = slotData.relayBids ? 
          Object.values(slotData.relayBids).flatMap((relay: any) => 
            relay.bids?.filter((bid: any) => bid.isWinning) || []
          )[0] : null;
          
        const blockValue = winningBid?.value;
        
        return {
          slot,
          blockHash,
          executionBlockNumber,
          transactionCount,
          blobCount,
          blockValue,
          proposerEntity: slotData.proposerEntity,
          gasUsed,
          gasLimit,
          isCurrentSlot,
          isPast,
          isFuture,
          hasData,
          isBuilding
        };
      }
      
      // For future slots, check for bids with negative time and extract detailed bid information
      if (isFuture) {
        const previousSlotData = slotDataStore.getSlotData(network, currentSlot || 0);
        let futureBidsCount = 0;
        const futureBids: Array<{ value: number; relayName: string; builderName?: string }> = [];
        
        if (previousSlotData?.relayBids) {
          // Process bids with negative time (for next slot)
          Object.entries(previousSlotData.relayBids).forEach(([relayName, relay]: [string, any]) => {
            if (relay.bids && Array.isArray(relay.bids)) {
              // Filter bids with negative time (which indicates they're for the next slot)
              // Some systems use negative time to indicate next slot bids
              const negativeBids = relay.bids.filter((bid: any) => {
                const bidTime = typeof bid.time === 'number' ? bid.time : 0;
                return bidTime < 0;
              });
              
              futureBidsCount += negativeBids.length;
              
              // Process detailed bid information to show in the UI
              negativeBids.forEach((bid: any) => {
                try {
                  // Get builder name if available
                  let builderName = undefined;
                  
                  // Try to get builder name from the data
                  if (bid.builderPubkey) {
                    // Check if any BuilderNames store/data is available
                    if (previousSlotData.builderNames) {
                      builderName = previousSlotData.builderNames[bid.builderPubkey];
                    }
                  }
                  
                  // Convert value to ETH - handle various value formats
                  let valueInEth = 0;
                  if (typeof bid.value === 'string') {
                    try {
                      // Try to handle big integers safely
                      valueInEth = Number(BigInt(bid.value)) / 1e18;
                    } catch (e) {
                      // If not a valid bigint string, try direct conversion
                      valueInEth = parseFloat(bid.value) / 1e18;
                    }
                  } else if (typeof bid.value === 'number') {
                    valueInEth = bid.value;
                  }
                  
                  futureBids.push({
                    value: valueInEth,
                    relayName,
                    builderName
                  });
                } catch (error) {
                  console.error("Error processing future bid", error);
                }
              });
            }
          });
        }
        
        // Sort future bids by value (highest first)
        futureBids.sort((a, b) => b.value - a.value);
        
        // Debug log to investigate why future bids might not be showing
        console.debug(`Future slot ${slot} has ${futureBidsCount} bids`, futureBids);
        
        // Try to get prefetched data for the future slot
        const prefetchedData = slotDataStore.getSlotData(network, slot);
        if (prefetchedData) {
          // We have prefetched data for this future slot
          const block = prefetchedData.block || {};
          
          // Extract basic information if available
          const proposerEntity = prefetchedData.proposerEntity;
          
          return {
            slot,
            futureBidsCount,
            futureBids,
            proposerEntity,
            isCurrentSlot,
            isPast,
            isFuture,
            hasData: !!prefetchedData,
            isBuilding: false // Future slot is not in building phase yet
          };
        }
        
        // If we have future bids but no prefetched data, still include the bids
        return {
          slot,
          futureBidsCount,
          futureBids,
          isCurrentSlot,
          isPast,
          isFuture,
          hasData: false,
          isBuilding: false
        };
      }
      
      // Return basic data for slots without data
      return {
        slot,
        isCurrentSlot,
        isPast,
        isFuture,
        hasData: false,
        isBuilding: isCurrentSlot // If current slot with no data, it's likely in building phase
      };
    });
  }, [displaySlots, slotDataStore, network, currentSlot, currentTime]);

  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <div className="w-full h-full flex flex-col justify-center">
        <div className="text-sm font-medium mb-3 text-primary flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-gold mr-1.5"></div>
            Blockchain
          </div>
        </div>
        
        {/* Top-down Blockchain visualization */}
        <div className="relative flex flex-col items-center justify-center h-full">
          {/* Connecting line - now horizontal from top to bottom */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 z-0"></div>
          
          {/* Blocks - now arranged horizontally */}
          <div className="relative z-10 flex flex-row items-center space-x-5 px-4 w-full h-full justify-around">
            {blockData.map((block, index) => (
              <div 
                key={block.slot}
                className={`flex items-center justify-center h-full ${
                  block.isCurrentSlot ? 'scale-100 flex-1 max-w-lg' : 'flex-initial w-48'
                } transition-all duration-300`}
              >
                {/* Past blocks (condensed) */}
                {block.isPast && (
                  <div className="bg-surface/20 rounded-xl overflow-hidden w-full h-[140px] transition-all duration-300 backdrop-blur-sm relative border border-gold/20">
                    {/* Gold indicator at top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/30 to-gold/10"></div>
                    
                    {/* Header with slot number */}
                    <div className="px-4 pt-3 pb-1 border-b border-gold/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-gold/5 px-2 py-1 rounded text-xs font-medium text-gold/80">
                            SLOT {block.slot}
                          </div>
                        </div>
                        {block.hasData && block.blockValue !== undefined && (
                          <div className="text-xs bg-green-500/5 px-2 py-0.5 rounded text-green-300/90 font-mono font-medium">
                            {block.blockValue.toFixed(2)} ETH
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Block content */}
                    <div className="px-4 pt-2 pb-3">
                      <div className="flex flex-col gap-1.5">
                        {block.executionBlockNumber && (
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/30 mr-1.5"></div>
                            <span className="text-[10px] text-white/40 uppercase mr-1">Block</span>
                            <span className="text-sm font-medium text-amber-400/90 font-mono">{block.executionBlockNumber}</span>
                          </div>
                        )}
                        
                        {block.hasData && block.transactionCount !== undefined && (
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/30 mr-1.5"></div>
                            <span className="text-[10px] text-white/40 uppercase mr-1">Tx</span>
                            <span className="text-sm font-medium text-white/80 font-mono">{block.transactionCount}</span>
                          </div>
                        )}
                        
                        {block.hasData && block.blobCount !== undefined && block.blobCount > 0 && (
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/30 mr-1.5"></div>
                            <span className="text-[10px] text-white/40 uppercase mr-1">Blobs</span>
                            <span className="text-sm font-medium text-purple-400/90 font-mono">{block.blobCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Current block (expanded) */}
                {block.isCurrentSlot && (
                  <div className="bg-surface/20 rounded-xl overflow-hidden shadow-lg w-full h-[280px] transition-all duration-300 backdrop-blur-sm relative border border-gold/30">
                    {/* Gold indicator at top - more prominent for current slot */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold/70 via-gold/40 to-gold/10"></div>
                    
                    <div className="p-4 flex items-center justify-between border-b border-gold/20">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center mr-3 relative overflow-hidden">
                          {/* Animated pulse in the background */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-gold/30 to-amber-500/5 animate-pulse"></div>
                          
                          <svg className="w-5 h-5 text-gold/90 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 8H8M16 12H8M16 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-baseline">
                            <div className="bg-gold/10 px-2 py-1 rounded text-xs font-semibold text-gold/90 uppercase tracking-wide mr-2">
                              SLOT
                            </div>
                            <span className="text-xl font-mono font-bold text-gold/90">{block.slot}</span>
                          </div>
                          {block.hasData && block.proposerEntity && (
                            <p className="text-xs mt-1.5 flex items-center">
                              <span className="text-white/50 mr-1">Proposer:</span>
                              <span className="text-white/80 font-medium">{block.proposerEntity}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Value badge */}
                      {block.hasData && block.blockValue !== undefined && (
                        <div className="px-3 py-1.5 bg-green-500/5 rounded-lg text-green-400/90 text-sm font-mono flex items-center relative overflow-hidden group">
                          {/* Background glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <svg className="w-4 h-4 mr-1.5 text-green-400/80 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6V18M16 10L8 14M8 10L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <span className="relative z-10 font-semibold">{block.blockValue.toFixed(4)} ETH</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Building phase (skeleton loader) */}
                    {block.isBuilding ? (
                      <div className="flex flex-col p-6 animate-pulse h-[calc(100%-4rem)]">
                        <div className="flex flex-col">
                          <div className="h-3 w-32 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-48 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-40 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-36 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-44 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-32 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-28 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-40 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-36 bg-white/10 rounded mb-3"></div>
                          <div className="h-3 w-44 bg-white/10 rounded mb-3"></div>
                        </div>
                        
                        <div className="flex items-center justify-center mt-6">
                          <span className="text-sm text-white/70 px-4 py-2 bg-white/5 rounded-lg shadow-inner backdrop-blur-sm">
                            Building block...
                          </span>
                        </div>
                      </div>
                    ) : block.hasData ? (
                      <>
                        {/* Dense block data display - only showing fields we have data for */}
                        <div className="px-5 pt-2 pb-5 h-[calc(100%-4rem)] overflow-y-auto">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {/* Left column - Block details */}
                            <div className="space-y-2">
                              {/* Block number - from ExecutionPayloadBlockNumber */}
                              {block.executionBlockNumber !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-amber-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Block:</span>
                                  <span className="text-sm font-medium text-amber-400 font-mono">
                                    {block.executionBlockNumber}
                                  </span>
                                </div>
                              )}
                              
                              {/* Transactions - from ExecutionPayloadTransactionsCount */}
                              {block.transactionCount !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-blue-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Transactions:</span>
                                  <span className="text-sm font-medium text-white/90 font-mono">
                                    {block.transactionCount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              
                              {/* Block Hash */}
                              {block.blockHash && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-yellow-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Hash:</span>
                                  <span className="text-xs font-medium text-yellow-400/90 font-mono">
                                    {formatHash(block.blockHash, 8, 8)}
                                  </span>
                                </div>
                              )}
                              
                              {/* Blob Count - calculated from ExecutionPayloadBlobGasUsed */}
                              {block.blobCount !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-purple-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Blobs:</span>
                                  <span className="text-sm font-medium text-purple-400/90 font-mono">
                                    {block.blobCount > 0 ? block.blobCount : '0'}
                                  </span>
                                </div>
                              )}
                              
                              {/* Gas Usage - percentage */}
                              {block.gasUsed !== undefined && block.gasLimit !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-cyan-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Gas Usage:</span>
                                  <span className="text-sm font-medium text-cyan-400/90 font-mono">
                                    {Math.round(block.gasUsed * 100 / block.gasLimit)}%
                                  </span>
                                </div>
                              )}
                              
                              {/* Gas Used - from ExecutionPayloadGasUsed */}
                              {block.gasUsed !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-transparent rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Gas Used:</span>
                                  <span className="text-xs font-medium text-white/70 font-mono">
                                    {block.gasUsed.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              
                              {/* Gas Limit - from ExecutionPayloadGasLimit */}
                              {block.gasLimit !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-transparent rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Gas Limit:</span>
                                  <span className="text-xs font-medium text-white/70 font-mono">
                                    {block.gasLimit.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              
                              {/* Block Total Bytes - would come from block_total_bytes */}
                              {/* Add actual field if it exists in the data */}
                            </div>
                            
                            {/* Right column */}
                            <div className="space-y-2">
                              {/* Proposer Entity */}
                              {block.proposerEntity && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-orange-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Proposer:</span>
                                  <span className="text-sm font-medium text-orange-300/90">
                                    {block.proposerEntity}
                                  </span>
                                </div>
                              )}
                              
                              {/* Block Reward - from winning bid value */}
                              {block.blockValue !== undefined && (
                                <div className="flex items-center">
                                  <div className="w-1 h-4 bg-green-400/50 rounded-full mr-2"></div>
                                  <span className="text-xs text-white/50 uppercase mr-2">Reward:</span>
                                  <span className="text-sm font-medium text-green-400/90 font-mono">
                                    {block.blockValue.toFixed(4)} ETH
                                  </span>
                                </div>
                              )}
                              
                              {/* Base Fee - from ExecutionPayloadBaseFeePerGas */}
                              {/* Field would come from execution_payload_base_fee_per_gas */}
                              {/* Add actual field if available in your data store */}
                            </div>
                          </div>
                          
                          {/* Progress bar removed as requested */}
                        </div>
                      </>
                    ) : (
                      <div className="h-[calc(100%-4rem)] flex flex-col items-center justify-center space-y-3 text-white/40">
                        <svg className="w-12 h-12 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <p className="text-sm">Waiting for block data...</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Future block (next slot) */}
                {block.isFuture && (
                  <div className="bg-surface/20 rounded-xl overflow-hidden shadow-md w-full h-[140px] transition-all duration-300 backdrop-blur-sm relative border border-blue-500/20">
                    {/* Blue indicator at top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-500/20 to-blue-500/5"></div>
                    
                    {/* Header with slot number */}
                    <div className="px-4 pt-3 pb-1 border-b border-blue-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-blue-500/5 px-2 py-1 rounded text-xs font-medium text-blue-400/80">
                            SLOT {block.slot}
                          </div>
                        </div>
                        {block.futureBidsCount > 0 && (
                          <div className="text-xs bg-blue-500/5 px-2 py-0.5 rounded text-blue-400/90 font-mono font-medium">
                            {block.futureBidsCount} bid{block.futureBidsCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Future bids preview */}
                    {block.futureBids && block.futureBids.length > 0 ? (
                      <div className="px-4 pt-2 overflow-y-auto max-h-[80px]">
                        <div className="space-y-2">
                          {block.futureBids.slice(0, 2).map((bid, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-blue-500/5 rounded-lg">
                              <div className="flex items-center">
                                <div className="w-1 h-5 bg-blue-400/20 rounded-full mr-2"></div>
                                <div className="text-xs text-white/80 truncate">
                                  {bid.builderName || `${truncateMiddle(bid.relayName, 6, 4)}`}
                                </div>
                              </div>
                              <div className="text-xs font-mono text-green-300/90 font-medium">
                                {bid.value.toFixed(4)} ETH
                              </div>
                            </div>
                          ))}
                          {block.futureBids.length > 2 && (
                            <div className="text-[10px] text-center text-white/50 mt-1">
                              +{block.futureBids.length - 2} more bids
                            </div>
                          )}
                        </div>
                      </div>
                    ) : block.futureBidsCount && block.futureBidsCount > 0 ? (
                      <div className="p-3 flex items-center justify-center h-[80px]">
                        <div className="text-xs bg-blue-500/5 px-3 py-2 rounded-lg text-blue-400/90 flex items-center">
                          <svg className="w-4 h-4 mr-1.5 text-blue-400/80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {block.futureBidsCount} incoming bid{block.futureBidsCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-center h-[80px]">
                        <div className="text-xs text-white/40 bg-white/5 px-3 py-2 rounded-lg backdrop-blur-sm">
                          Waiting for builder bids...
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Removed connection dots as requested */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainVisualization;