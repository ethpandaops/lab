import React from 'react';
import { 
  NormalizedBlockData, 
  formatHash, 
  formatTimestamp, 
  formatBytes, 
  formatGwei,
  calculateBlobCount
} from './blockDataNormalizer';

interface BlockContentProps {
  blockData: NormalizedBlockData;
  isBuilding: boolean;
  proposerEntity?: string;
  isPast?: boolean;
  isCurrentSlot?: boolean;
  isFuture?: boolean;
  futureBids?: Array<{
    value: number;
    relayName: string;
    builderName?: string;
  }>;
}

/**
 * BlockContent displays the main content section of a block
 * with detailed information about transactions, gas, etc.
 */
const BlockContent: React.FC<BlockContentProps> = ({
  blockData,
  isBuilding,
  proposerEntity,
  isPast = false,
  isCurrentSlot = false,
  isFuture = false,
  futureBids = []
}) => {
  // If we're in the building phase, show a skeleton loader
  if (isBuilding) {
    return (
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
    );
  }
  
  // If this is a future slot with bids, show those
  if (isFuture && futureBids && futureBids.length > 0) {
    return (
      <div className="px-4 pt-2 overflow-y-auto max-h-[80px]">
        <div className="space-y-2">
          {futureBids.slice(0, 5).map((bid, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-blue-500/5 rounded-lg">
              <div className="flex items-center">
                <div className="w-1 h-5 bg-blue-400/20 rounded-full mr-2"></div>
                <div className="text-xs text-white/80 truncate">
                  {bid.builderName || bid.relayName}
                </div>
              </div>
              <div className="text-xs font-mono text-green-300/90 font-medium">
                {bid.value.toFixed(4)} ETH
              </div>
            </div>
          ))}
          {futureBids.length > 5 && (
            <div className="text-[10px] text-center text-white/50 mt-1">
              +{futureBids.length - 5} more bids
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // If we're waiting for data, show a loading state
  if (!blockData?.blockRoot && !blockData?.executionPayloadBlockHash) {
    return (
      <div className="h-[calc(100%-4rem)] flex flex-col items-center justify-center space-y-3 text-white/40">
        <svg className="w-12 h-12 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-sm">Waiting for block data...</p>
      </div>
    );
  }
  
  // If we have block data, show the full block content
  const blobCount = calculateBlobCount(blockData);
  
  return (
    <div className="px-5 pt-2 pb-5 h-[calc(100%-4rem)] overflow-y-auto">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {/* Left column - Block details */}
        <div className="space-y-2">
          {/* Block number */}
          {blockData?.executionPayloadBlockNumber !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-amber-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Block:</span>
              <span className="text-sm font-medium text-amber-400 font-mono">
                {blockData.executionPayloadBlockNumber.toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Transaction count */}
          {blockData?.executionPayloadTransactionsCount !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-blue-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Transactions:</span>
              <span className="text-sm font-medium text-white/90 font-mono">
                {blockData.executionPayloadTransactionsCount.toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Block Hash */}
          {blockData?.executionPayloadBlockHash && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-yellow-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Hash:</span>
              <span className="text-xs font-medium text-yellow-400/90 font-mono">
                {formatHash(blockData.executionPayloadBlockHash, 8, 8)}
              </span>
            </div>
          )}
          
          {/* Fee recipient */}
          {blockData?.executionPayloadFeeRecipient && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-green-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Fee Recipient:</span>
              <span className="text-xs font-medium text-green-300/90 font-mono">
                {formatHash(blockData.executionPayloadFeeRecipient, 6, 4)}
              </span>
            </div>
          )}
          
          {/* Base Fee Per Gas */}
          {blockData?.executionPayloadBaseFeePerGas !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-red-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Base Fee:</span>
              <span className="text-xs font-medium text-red-300/90 font-mono">
                {formatGwei(blockData.executionPayloadBaseFeePerGas)}
              </span>
            </div>
          )}
          
          {/* Gas Limit */}
          {blockData?.executionPayloadGasLimit !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-cyan-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Gas Limit:</span>
              <span className="text-xs font-medium text-cyan-300/90 font-mono">
                {blockData.executionPayloadGasLimit.toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Gas Used */}
          {blockData?.executionPayloadGasUsed !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-cyan-400/30 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Gas Used:</span>
              <span className="text-xs font-medium text-cyan-200/90 font-mono">
                {blockData.executionPayloadGasUsed.toLocaleString()} 
                {blockData.executionPayloadGasLimit 
                  ? ` (${Math.round(blockData.executionPayloadGasUsed * 100 / blockData.executionPayloadGasLimit)}%)`
                  : ''}
              </span>
            </div>
          )}

          {/* State Root - only show if different from the state root in the header */}
          {blockData?.executionPayloadStateRoot && 
           blockData.executionPayloadStateRoot !== blockData.stateRoot && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-yellow-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">State Root (EL):</span>
              <span className="text-xs font-medium text-yellow-400/90 font-mono">
                {formatHash(blockData.executionPayloadStateRoot, 6, 4)}
              </span>
            </div>
          )}
        </div>
        
        {/* Right column */}
        <div className="space-y-2">
          {/* Proposer Entity */}
          {proposerEntity && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-orange-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Proposer:</span>
              <span className="text-sm font-medium text-orange-300/90">
                {proposerEntity}
              </span>
            </div>
          )}
          
          {/* Blob Count */}
          <div className="flex items-center">
            <div className="w-1 h-4 bg-purple-400/50 rounded-full mr-2"></div>
            <span className="text-xs text-white/50 uppercase mr-2">Blobs:</span>
            <span className="text-sm font-medium text-purple-400/90 font-mono">
              {blobCount}
            </span>
          </div>
          
          {/* Parent Hash */}
          {blockData?.executionPayloadParentHash && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-amber-300/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Parent Hash:</span>
              <span className="text-xs font-medium text-amber-300/90 font-mono">
                {formatHash(blockData.executionPayloadParentHash, 6, 4)}
              </span>
            </div>
          )}
          
          {/* Excess Blob Gas */}
          {blockData?.executionPayloadExcessBlobGas !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-pink-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Excess Blob Gas:</span>
              <span className="text-xs font-medium text-pink-300/90 font-mono">
                {blockData.executionPayloadExcessBlobGas.toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Transaction Total Bytes */}
          {blockData?.transactionsTotalBytes !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-blue-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Tx Bytes:</span>
              <span className="text-xs font-medium text-blue-300/90 font-mono">
                {formatBytes(blockData.transactionsTotalBytes)}
              </span>
            </div>
          )}  
          
          {/* Timestamp */}
          {blockData?.executionPayloadTimestamp !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-gray-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Timestamp:</span>
              <span className="text-xs font-medium text-gray-300/90 font-mono">
                {formatTimestamp(blockData.executionPayloadTimestamp)}
              </span>
            </div>
          )}
          
          {/* Block Total Bytes */}
          {blockData?.blockTotalBytes !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-indigo-400/50 rounded-full mr-2"></div>
              <span className="text-xs text-white/50 uppercase mr-2">Block Size:</span>
              <span className="text-xs font-medium text-indigo-300/90 font-mono">
                {formatBytes(blockData.blockTotalBytes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockContent;