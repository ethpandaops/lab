import React from 'react';
import {
  NormalizedBlockData,
  formatHash,
  formatTimestamp,
  formatBytes,
  formatGwei,
  calculateBlobCount,
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
  isLocallyBuilt?: boolean;
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
  futureBids = [],
  isLocallyBuilt = false,
}) => {
  // If we're in the building phase, show a skeleton loader
  if (isBuilding) {
    return (
      <div className="flex flex-col p-6 animate-pulse h-[calc(100%-4rem)]">
        <div className="flex flex-col">
          <div className="h-3 w-32 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-48 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-40 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-36 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-44 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-32 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-28 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-40 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-36 bg-bg-hover rounded mb-3"></div>
          <div className="h-3 w-44 bg-bg-hover rounded mb-3"></div>
        </div>

        <div className="flex items-center justify-center mt-6">
          <span className="text-sm text-text-secondary px-4 py-2 bg-bg-surface-raised rounded shadow-inner backdrop-blur-sm">
            {isFuture ? 'Pending' : 'Building block...'}
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
            <div
              key={i}
              className="flex justify-between items-center py-1.5 px-3 bg-bg-surface-raised rounded"
            >
              <div className="flex items-center">
                <div className="w-1 h-5 bg-accent-muted/20 rounded-full mr-2"></div>
                <div className="text-xs text-text-secondary truncate">
                  {bid.builderName || bid.relayName}
                </div>
              </div>
              <div className="text-xs font-mono text-success font-medium">
                {bid.value.toFixed(4)} ETH
              </div>
            </div>
          ))}
          {futureBids.length > 5 && (
            <div className="text-[10px] text-center text-text-tertiary mt-1">
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
      <div className="h-[calc(100%-4rem)] flex flex-col items-center justify-center space-y-3 text-text-tertiary">
        <svg
          className="w-12 h-12 animate-pulse"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-mono">Waiting for block data...</p>
      </div>
    );
  }

  // If we have block data, show the full block content
  const blobCount = calculateBlobCount(blockData);

  // For past blocks, only show blob count and transaction count
  if (isPast) {
    return (
      <div className="px-5 pt-2 pb-5 h-[calc(100%-4rem)] flex items-center justify-center">
        <div className="flex items-center space-x-6">
          {/* Blob Count */}
          <div className="flex items-center">
            <span className="text-text-tertiary mr-1">Blobs:</span>
            <span className="text-text-secondary font-mono text-base">
              {blockData?.executionPayloadBlobGasUsed
                ? Math.ceil(Number(blockData.executionPayloadBlobGasUsed) / 131072)
                : 0}
            </span>
          </div>

          {/* Transaction Count */}
          <div className="flex items-center">
            <span className="text-text-tertiary mr-1">Txns:</span>
            <span className="text-text-secondary font-mono text-base">
              {blockData?.executionPayloadTransactionsCount || 0}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-2 pb-5 h-[calc(100%-4rem)] overflow-y-auto">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {/* Left column - Block details */}
        <div className="space-y-2">
          {/* Block number */}
          {blockData?.executionPayloadBlockNumber !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Block:</span>
              <span className="text-sm font-medium text-text-primary font-mono">
                {blockData.executionPayloadBlockNumber.toLocaleString()}
              </span>
            </div>
          )}

          {/* Transaction count */}
          {blockData?.executionPayloadTransactionsCount !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Transactions:</span>
              <span className="text-sm font-medium text-text-primary font-mono">
                {blockData.executionPayloadTransactionsCount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Block Hash */}
          {blockData?.executionPayloadBlockHash && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Hash:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {formatHash(blockData.executionPayloadBlockHash, 8, 8)}
              </span>
            </div>
          )}

          {/* Fee recipient - changed label to just "Recipient" */}
          {blockData?.executionPayloadFeeRecipient && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Recipient:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {formatHash(blockData.executionPayloadFeeRecipient, 6, 4)}
              </span>
            </div>
          )}

          {/* Base Fee Per Gas */}
          {blockData?.executionPayloadBaseFeePerGas !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Base Fee:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {formatGwei(blockData.executionPayloadBaseFeePerGas)}
              </span>
            </div>
          )}

          {/* Gas Used and Gas Limit moved after Parent line */}

          {/* State Root removed as requested */}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {/* Proposer Entity */}
          {proposerEntity && (
            <div className="flex flex-col space-y-1">
              <div className="flex items-center">
                <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
                <span className="text-xs text-text-tertiary uppercase mr-2">Proposer:</span>
                <span className="text-sm font-medium text-text-secondary">{proposerEntity}</span>
              </div>
              {/* Show the local build status text regardless of other conditions */}
              <div className="ml-3 text-xs font-medium">
                {isLocallyBuilt ? (
                  <span className="text-amber-300">This block was built locally</span>
                ) : (
                  <span className="text-text-tertiary">This block was built by a builder</span>
                )}
              </div>
            </div>
          )}

          {/* Blob Count */}
          <div className="flex items-center">
            <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
            <span className="text-xs text-text-tertiary uppercase mr-2">Blobs:</span>
            <span className="text-sm font-medium text-text-primary font-mono">{blobCount}</span>
          </div>

          {/* Parent Hash - changed label to just "Parent" */}
          {blockData?.executionPayloadParentHash && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Parent:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {formatHash(blockData.executionPayloadParentHash, 6, 4)}
              </span>
            </div>
          )}

          {/* Gas Used - right after parent */}
          {blockData?.executionPayloadGasUsed !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Gas Used:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {blockData.executionPayloadGasUsed.toLocaleString()}
                {blockData.executionPayloadGasLimit
                  ? ` (${Math.round((blockData.executionPayloadGasUsed * 100) / blockData.executionPayloadGasLimit)}%)`
                  : ''}
              </span>
            </div>
          )}

          {/* Gas Limit - right after Gas Used */}
          {blockData?.executionPayloadGasLimit !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Gas Limit:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {blockData.executionPayloadGasLimit.toLocaleString()}
              </span>
            </div>
          )}

          {/* Transaction Total Bytes */}
          {blockData?.transactionsTotalBytes !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Tx Bytes:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {formatBytes(blockData.transactionsTotalBytes)}
              </span>
            </div>
          )}

          {/* Timestamp */}
          {blockData?.executionPayloadTimestamp !== undefined && (
            <div className="flex items-center">
              <div className="w-1 h-4 bg-bg-surface-raised rounded-full mr-2"></div>
              <span className="text-xs text-text-tertiary uppercase mr-2">Timestamp:</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {formatTimestamp(blockData.executionPayloadTimestamp)}
              </span>
            </div>
          )}

          {/* Removed Block Total Bytes as requested */}
        </div>
      </div>
    </div>
  );
};

export default BlockContent;
