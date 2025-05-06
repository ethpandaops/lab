import React from 'react';

export interface BeaconBlockVisualizationProps {
  proposer_index?: number | string;
  slot?: number | string;
  execution_block_number?: number | string;
  execution_transaction_count?: number | string;
  block_hash?: string;
  execution_block_hash?: string;
  blob_count?: number;
  block_value?: number; // In ETH
  proposer_entity?: string; // Entity operating the validator
  className?: string;
  width?: string | number;
  height?: string | number;
}

const BeaconBlockVisualization: React.FC<BeaconBlockVisualizationProps> = ({
  proposer_index,
  slot,
  execution_block_number,
  execution_transaction_count = 0,
  block_hash,
  execution_block_hash,
  blob_count = 0,
  block_value,
  proposer_entity,
  className = '',
  width = '100%',
  height = '100%'
}) => {
  // Format block hash for display
  const formatHash = (hash?: string, startChars = 6, endChars = 4) => {
    if (!hash) return '—';
    if (hash.length <= startChars + endChars) return hash;
    return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
  };

  // Convert string or number to a number safely
  const toNumber = (value?: string | number): number => {
    if (value === undefined || value === null) return 0;
    return typeof value === 'string' ? parseInt(value, 10) || 0 : value;
  };

  const txCount = toNumber(execution_transaction_count);
  const blobsCount = toNumber(blob_count);

  return (
    <div 
      className={`relative ${className}`}
      style={{ width, height }}
    >
      {/* Main container with card styling - main block only */}
      <div className="w-full h-64 flex flex-col">
        {/* Beacon Block (Consensus Layer) */}
        <div className="bg-surface/90 border border-subtle flex-1 p-4 relative overflow-hidden shadow-sm">
          {/* Background accent */}
          <div className="absolute inset-0 bg-indigo-500/5 border-b-2 border-indigo-500/20"></div>
          
          {/* Header - simplified */}
          <div className="relative z-10 flex justify-between items-start mb-3">
            <div>
              <h4 className="text-sm font-medium text-primary">
                Beacon Block <span className="text-indigo-400">{slot}</span>
              </h4>
              <div className="text-xs text-secondary mt-0.5">
                By {proposer_entity || `Validator ${proposer_index}`}
              </div>
            </div>
          </div>
          
          {/* Block value indicator - simplified with square corners */}
          {block_value !== undefined && (
            <div className="absolute top-4 right-4 flex items-center bg-green-500/10 px-2 py-0.5 border border-green-500/30 z-10">
              <span className="text-xs text-green-500 font-medium">{block_value.toFixed(4)} ETH</span>
            </div>
          )}
          
          {/* Separator with visual indicator */}
          <div className="flex items-center my-2 relative z-10">
            <div className="flex-1 h-px bg-subtle/50"></div>
            <div className="px-2 text-[10px] text-tertiary">Execution Payload</div>
            <div className="flex-1 h-px bg-subtle/50"></div>
          </div>
          
          {/* Execution Block (Execution Layer) - completely edge to edge */}
          <div className="relative z-10 bg-surface/80 border-x border-t border-subtle">
            {/* Execution block header */}
            <div className="flex justify-between items-center px-4 py-2">
              <div className="text-xs text-primary">
                Block <span className="text-amber-500">{execution_block_number}</span>
              </div>
              <div className="text-[10px] font-mono text-tertiary">
                {formatHash(execution_block_hash, 4, 4)}
              </div>
            </div>
            
            {/* Transaction visualization section - completely full width */}
            <div className="border-t border-subtle/30">
              {/* Transaction count indicator */}
              <div className="px-4 pt-2 pb-1">
                <div className="text-[10px] text-secondary">
                  {txCount} transactions
                </div>
              </div>
              
              {/* Transaction grid - full width with no bottom padding */}
              <div className="px-4 pb-0 h-[85px]">
                {txCount > 0 ? (
                  <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-x-0.5 gap-y-0.5 content-start">
                    {Array.from({ length: Math.min(txCount, 160) }).map((_, i) => (
                      <div 
                        key={`tx-${i}`} 
                        className="w-1.5 h-1.5 bg-amber-500/60"
                      />
                    ))}
                    {txCount > 160 && (
                      <div className="col-span-full text-[9px] text-tertiary mt-0.5">
                        +{txCount - 160} more transactions
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-tertiary">No transactions</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Blob section - redesigned to scale based on count, max 2 rows */}
      {blobsCount > 0 && (
        <div className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 bg-surface/90 border border-subtle px-3 py-2 shadow-sm w-full max-w-[320px]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 mr-1.5"></div>
              <div className="text-xs text-secondary font-medium">
                <span className="text-purple-500">{blobsCount}</span> {blobsCount === 1 ? 'Blob' : 'Blobs'}
              </div>
            </div>
            {blobsCount > 16 && (
              <div className="text-[10px] text-tertiary">
                {blobsCount > 64 ? 'Showing 64 (max)' : `Showing ${Math.min(blobsCount, 64)} of ${blobsCount}`}
              </div>
            )}
          </div>
          
          {/* Adaptive blob grid visualization - dynamically scales based on count */}
          {(() => {
            // Calculate grid columns and size based on blob count
            // For 1-8 blobs: 8 columns (1 row of larger blobs)
            // For 9-16 blobs: 8 columns (2 rows of medium blobs)
            // For 17-32 blobs: 16 columns (2 rows of small blobs)
            // For 33-64 blobs: 32 columns (2 rows of tiny blobs)
            
            if (blobsCount > 32) {
              // 33-64 blobs: 32 columns, tiny blobs
              return (
                <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-0.5 w-full">
                  {Array.from({ length: Math.min(blobsCount, 64) }).map((_, i) => (
                    <div 
                      key={`blob-${i}`}
                      className="w-2 h-2 border border-purple-500/20 bg-purple-500/30"
                      title={`Blob ${i+1} of ${blobsCount}`}
                    />
                  ))}
                  {blobsCount > 64 && (
                    <div className="col-span-full mt-1 text-center text-xs text-tertiary">
                      + {blobsCount - 64} more blob{blobsCount - 64 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            } else if (blobsCount > 16) {
              // 17-32 blobs: 16 columns, small blobs
              return (
                <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5 w-full">
                  {Array.from({ length: Math.min(blobsCount, 32) }).map((_, i) => (
                    <div 
                      key={`blob-${i}`}
                      className="w-4 h-4 border border-purple-500/20 bg-purple-500/30"
                      title={`Blob ${i+1} of ${blobsCount}`}
                    />
                  ))}
                  {blobsCount > 32 && (
                    <div className="col-span-full mt-1 text-center text-xs text-tertiary">
                      + {blobsCount - 32} more blob{blobsCount - 32 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            } else if (blobsCount > 8) {
              // 9-16 blobs: 8 columns, medium blobs
              return (
                <div className="grid grid-cols-8 gap-1 w-full">
                  {Array.from({ length: Math.min(blobsCount, 16) }).map((_, i) => (
                    <div 
                      key={`blob-${i}`}
                      className="w-7 h-7 border border-purple-500/20 bg-purple-500/30"
                      title={`Blob ${i+1} of ${blobsCount}`}
                    />
                  ))}
                  {blobsCount > 16 && (
                    <div className="col-span-full mt-1 text-center text-xs text-tertiary">
                      + {blobsCount - 16} more blob{blobsCount - 16 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            } else {
              // 1-8 blobs: 8 columns, large blobs (1 row)
              return (
                <div className="grid grid-cols-8 gap-1 w-full">
                  {Array.from({ length: Math.min(blobsCount, 8) }).map((_, i) => (
                    <div 
                      key={`blob-${i}`}
                      className="w-8 h-8 border border-purple-500/20 bg-purple-500/30"
                      title={`Blob ${i+1} of ${blobsCount}`}
                    />
                  ))}
                  {blobsCount > 8 && (
                    <div className="col-span-full mt-1 text-center text-xs text-tertiary">
                      + {blobsCount - 8} more blob{blobsCount - 8 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};

export default BeaconBlockVisualization;