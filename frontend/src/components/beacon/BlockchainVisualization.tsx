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
                  <div className="bg-surface/30 border border-gold/20 rounded-lg overflow-hidden shadow-md w-full h-[140px] transition-all duration-300 backdrop-blur-sm">
                    <div className="py-3 px-4 border-b border-gold/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gold/10 rounded-md border border-gold/20 flex items-center justify-center mr-2">
                            <svg className="w-3 h-3 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </div>
                          <div className="text-xs font-medium text-white">Slot {block.slot}</div>
                        </div>
                        {block.hasData && block.blockValue !== undefined && (
                          <div className="text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded-sm text-green-300 font-mono">
                            {block.blockValue.toFixed(2)} ETH
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {block.executionBlockNumber && (
                            <div>
                              <span className="text-[10px] text-white/50 uppercase mr-1">BLOCK</span>
                              <span className="text-sm font-medium text-amber-400 font-mono">{block.executionBlockNumber}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          {block.hasData && block.transactionCount !== undefined && (
                            <div className="flex items-center">
                              <div className="text-[10px] text-white/50 uppercase mr-1">TX</div>
                              <div className="text-sm font-medium text-amber-400 font-mono">{block.transactionCount}</div>
                            </div>
                          )}
                          {block.hasData && block.blobCount !== undefined && block.blobCount > 0 && (
                            <div className="flex items-center mt-1">
                              <div className="text-[10px] text-white/50 uppercase mr-1">BLOBS</div>
                              <div className="text-sm font-medium text-purple-400 font-mono">{block.blobCount}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Current block (expanded) */}
                {block.isCurrentSlot && (
                  <div className="bg-surface/20 border border-gold/20 rounded-lg overflow-hidden shadow-xl w-full h-[280px] transition-all duration-300 backdrop-blur-sm">
                    <div className="p-4 border-b border-gold/20 bg-gold/5 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gold/20 rounded-md border border-gold/40 flex items-center justify-center mr-3" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)' }}>
                          <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 8H8M16 12H8M16 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-baseline">
                            <h3 className="text-sm uppercase tracking-wide text-white/70">SLOT</h3>
                            <span className="text-xl font-mono font-semibold text-gold ml-2">{block.slot}</span>
                          </div>
                          {block.hasData && block.proposerEntity && (
                            <p className="text-xs mt-0.5 flex items-center">
                              <span className="text-white/60">Proposer:</span>
                              <span className="text-white/90 ml-1 font-medium">{block.proposerEntity}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Value badge */}
                      {block.hasData && block.blockValue !== undefined && (
                        <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-md text-green-400 text-sm font-mono flex items-center" style={{ boxShadow: '0 0 8px rgba(74, 222, 128, 0.2)' }}>
                          <svg className="w-4 h-4 mr-1.5 text-green-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6V18M16 10L8 14M8 10L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          {block.blockValue.toFixed(4)} ETH
                        </div>
                      )}
                    </div>
                    
                    {/* Building phase (skeleton loader) */}
                    {block.isBuilding ? (
                      <div className="flex flex-col p-6 space-y-6 animate-pulse h-[calc(100%-4rem)]">
                        <div className="grid grid-cols-2 gap-3 h-full">
                          {/* Block Number */}
                          <div className="flex flex-col bg-surface/10 rounded-lg p-4 border border-white/5">
                            <div className="h-3 w-20 bg-white/10 rounded mb-3"></div>
                            <div className="h-8 w-24 bg-white/10 rounded"></div>
                          </div>
                          
                          {/* Transactions */}
                          <div className="flex flex-col bg-surface/10 rounded-lg p-4 border border-white/5">
                            <div className="h-3 w-24 bg-white/10 rounded mb-3"></div>
                            <div className="h-8 w-16 bg-white/10 rounded"></div>
                          </div>
                          
                          {/* Gas Usage */}
                          <div className="flex flex-col bg-surface/10 rounded-lg p-4 border border-white/5">
                            <div className="h-3 w-20 bg-white/10 rounded mb-3"></div>
                            <div className="h-5 w-16 bg-white/10 rounded mb-2"></div>
                            <div className="h-3 w-32 bg-white/10 rounded"></div>
                          </div>
                          
                          {/* Blobs */}
                          <div className="flex flex-col bg-surface/10 rounded-lg p-4 border border-white/5">
                            <div className="h-3 w-16 bg-white/10 rounded mb-3"></div>
                            <div className="h-8 w-10 bg-white/10 rounded"></div>
                          </div>
                          
                          {/* Reward */}
                          <div className="flex flex-col bg-surface/10 rounded-lg p-4 border border-white/5 col-span-2">
                            <div className="h-3 w-16 bg-white/10 rounded mb-3"></div>
                            <div className="h-8 w-24 bg-white/10 rounded"></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <span className="text-sm text-white/70 px-4 py-2 bg-white/5 rounded-md border border-white/10 shadow-inner">
                            Building block...
                          </span>
                        </div>
                      </div>
                    ) : block.hasData ? (
                      <>
                        {/* Block stats in a 3x2 grid */}
                        <div className="grid grid-cols-2 gap-3 p-5 h-[calc(100%-4rem)]">
                          {/* Execution block number */}
                          <div className="bg-surface/10 rounded-lg p-4 border border-white/5 flex flex-col justify-between">
                            <span className="text-xs text-white/50 uppercase tracking-wider">Block</span>
                            <span className="text-2xl font-medium text-amber-400 mt-1 font-mono">
                              {block.executionBlockNumber || 'N/A'}
                            </span>
                          </div>
                          
                          {/* Transaction count */}
                          <div className="bg-surface/10 rounded-lg p-4 border border-white/5 flex flex-col justify-between">
                            <span className="text-xs text-white/50 uppercase tracking-wider">Transactions</span>
                            <span className="text-2xl font-medium text-amber-400 mt-1 font-mono">
                              {block.transactionCount !== undefined ? block.transactionCount.toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          
                          {/* Gas usage */}
                          <div className="bg-surface/10 rounded-lg p-4 border border-white/5 flex flex-col justify-between">
                            <span className="text-xs text-white/50 uppercase tracking-wider">Gas Usage</span>
                            <div className="flex flex-col">
                              <span className="text-base font-medium text-blue-400 mt-1 font-mono">
                                {block.gasUsed !== undefined && block.gasLimit !== undefined 
                                  ? `${Math.round(block.gasUsed * 100 / block.gasLimit)}%` 
                                  : 'N/A'}
                              </span>
                              {block.gasUsed !== undefined && (
                                <span className="text-xs text-white/50 font-mono mt-1">
                                  {block.gasUsed.toLocaleString()} / {block.gasLimit?.toLocaleString() || 'N/A'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Blob count */}
                          <div className="bg-surface/10 rounded-lg p-4 border border-white/5 flex flex-col justify-between">
                            <span className="text-xs text-white/50 uppercase tracking-wider">Blobs</span>
                            <span className="text-2xl font-medium text-purple-400 mt-1 font-mono">
                              {block.blobCount !== undefined && block.blobCount > 0 ? block.blobCount : '0'}
                            </span>
                          </div>
                          
                          {/* Reward value */}
                          <div className="bg-surface/10 rounded-lg p-4 border border-white/5 flex flex-col justify-between col-span-2">
                            <span className="text-xs text-white/50 uppercase tracking-wider">Reward</span>
                            <span className="text-2xl font-medium text-green-400 mt-1 font-mono">
                              {block.blockValue !== undefined ? block.blockValue.toFixed(4) : '0.0000'} ETH
                            </span>
                          </div>
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
                  <div className="bg-surface/20 border border-blue-500/20 rounded-lg overflow-hidden shadow-md w-full h-[140px] transition-all duration-300 backdrop-blur-sm">
                    <div className="py-3 px-4 border-b border-blue-500/10 bg-blue-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-500/10 rounded-md border border-blue-500/20 flex items-center justify-center mr-2">
                            <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
                            </svg>
                          </div>
                          <div className="text-xs font-medium text-white/90">Slot {block.slot}</div>
                        </div>
                        {block.futureBidsCount > 0 && (
                          <div className="text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded-sm text-blue-300">
                            {block.futureBidsCount} bid{block.futureBidsCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Future bids preview */}
                    {block.futureBids && block.futureBids.length > 0 ? (
                      <div className="px-3 pt-2 overflow-y-auto max-h-[70px]">
                        <div className="space-y-1">
                          {block.futureBids.slice(0, 2).map((bid, i) => (
                            <div key={i} className="flex justify-between items-center py-1 px-2 bg-blue-500/5 rounded border border-blue-500/10">
                              <div className="text-xs text-white/80 truncate">
                                {bid.builderName || `${truncateMiddle(bid.relayName, 6, 4)}`}
                              </div>
                              <div className="text-xs font-mono text-green-300/90">
                                {bid.value.toFixed(4)} ETH
                              </div>
                            </div>
                          ))}
                          {block.futureBids.length > 2 && (
                            <div className="text-[10px] text-center text-white/40 mt-1">
                              +{block.futureBids.length - 2} more bids
                            </div>
                          )}
                        </div>
                      </div>
                    ) : block.futureBidsCount && block.futureBidsCount > 0 ? (
                      <div className="p-3 flex items-center justify-center h-[70px]">
                        <div className="text-xs bg-blue-500/10 px-3 py-1.5 rounded-md text-blue-300 flex items-center">
                          <svg className="w-4 h-4 mr-1.5 text-blue-300/80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {block.futureBidsCount} incoming bid{block.futureBidsCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 flex items-center justify-center h-[70px] text-white/40 text-xs">
                        Waiting for builder bids...
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