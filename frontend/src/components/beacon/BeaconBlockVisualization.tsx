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
  height = '100%',
}) => {
  // Format hash for display
  const formatHash = (hash?: string, startChars = 6, endChars = 4) => {
    if (!hash) return '—';
    if (hash.length <= startChars + endChars) return hash;
    return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
  };

  // Convert to number safely
  const toNumber = (value?: string | number): number => {
    if (value === undefined || value === null) return 0;
    return typeof value === 'string' ? parseInt(value) || 0 : value;
  };

  const txCount = toNumber(execution_transaction_count);
  const blobsCount = toNumber(blob_count);

  // A flowing data block approach - showing the block in transit
  return (
    <div className={`h-full w-full flex items-center justify-center ${className}`} style={{ width, height }}>
      <div className="w-full max-w-2xl mx-auto h-full flex flex-col justify-center relative">
        {/* Flow indicators with animation showing data movement left-to-right */}
        <style>{`
          @keyframes flowLeftToRight {
            0% {
              transform: translateX(-100%);
              opacity: 0;
            }
            10% {
              opacity: 0.7;
            }
            90% {
              opacity: 0.7;
            }
            100% {
              transform: translateX(0%);
              opacity: 0;
            }
          }
          @keyframes flowRightToLeft {
            0% {
              transform: translateX(100%);
              opacity: 0;
            }
            10% {
              opacity: 0.7;
            }
            90% {
              opacity: 0.7;
            }
            100% {
              transform: translateX(0%);
              opacity: 0;
            }
          }
          .flow-dot-left {
            animation: flowLeftToRight 3s infinite;
          }
          .flow-dot-right {
            animation: flowRightToLeft 3s infinite;
          }
        `}</style>

        {/* Card layout with subtle background and sharp edges */}
        <div className="bg-surface/10 backdrop-blur-sm rounded-lg border border-white/5 shadow-lg flex flex-col relative">
          {/* Flow indicators moved to be positioned relative to the card */}
          {/* Left side flow lines with animated dots - wider for large screens */}
          <div className="absolute top-1/2 -left-40 w-40 h-2 bg-gradient-to-r from-orange-500/0 to-orange-500/70 transform -translate-y-20 z-10 overflow-hidden">
            <div
              className="flow-dot-left absolute top-0 right-0 h-full w-8 bg-orange-400/80 rounded-full"
              style={{ animationDelay: '0s' }}
            ></div>
            <div
              className="flow-dot-left absolute top-0 right-0 h-full w-8 bg-orange-400/80 rounded-full"
              style={{ animationDelay: '1.5s' }}
            ></div>
          </div>
          <div className="absolute top-1/2 -left-50 w-50 h-2 bg-gradient-to-r from-green-500/0 to-green-500/70 transform translate-y-10 z-10 overflow-hidden">
            <div
              className="flow-dot-left absolute top-0 right-0 h-full w-8 bg-green-400/80 rounded-full"
              style={{ animationDelay: '0.5s' }}
            ></div>
            <div
              className="flow-dot-left absolute top-0 right-0 h-full w-8 bg-green-400/80 rounded-full"
              style={{ animationDelay: '2s' }}
            ></div>
          </div>

          {/* Right side flow lines with animated dots - wider for large screens */}
          <div className="absolute top-1/2 -right-40 w-40 h-2 bg-gradient-to-l from-purple-500/0 to-purple-500/70 transform -translate-y-20 z-10 overflow-hidden">
            <div
              className="flow-dot-right absolute top-0 left-0 h-full w-8 bg-purple-400/80 rounded-full"
              style={{ animationDelay: '0.7s' }}
            ></div>
            <div
              className="flow-dot-right absolute top-0 left-0 h-full w-8 bg-purple-400/80 rounded-full"
              style={{ animationDelay: '2.2s' }}
            ></div>
          </div>
          <div className="absolute top-1/2 -right-50 w-50 h-2 bg-gradient-to-l from-indigo-500/0 to-indigo-500/70 transform translate-y-10 z-10 overflow-hidden">
            <div
              className="flow-dot-right absolute top-0 left-0 h-full w-8 bg-indigo-400/80 rounded-full"
              style={{ animationDelay: '1.2s' }}
            ></div>
            <div
              className="flow-dot-right absolute top-0 left-0 h-full w-8 bg-indigo-400/80 rounded-full"
              style={{ animationDelay: '2.7s' }}
            ></div>
          </div>

          {/* Arrow indicators for flow direction - larger arrows, positioned outside the block */}
          <div className="absolute top-1/2 -left-14 transform -translate-y-5 z-20">
            <div className="p-1 bg-gold/20 rounded-full border border-gold/30">
              <svg className="h-10 w-10 text-gold drop-shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="absolute top-1/2 -right-14 transform -translate-y-5 z-20">
            <div className="p-1 bg-gold/20 rounded-full border border-gold/30">
              <svg className="h-10 w-10 text-gold drop-shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          {/* Block info header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 flex-shrink-0 mr-3 bg-gold/10 rounded-md border border-gold/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 8H8M16 12H8M16 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="flex items-baseline">
                  <h3 className="text-sm uppercase tracking-wide text-white/70">Slot</h3>
                  <span className="text-base font-mono font-semibold text-gold ml-2">{slot}</span>
                </div>
                <p className="text-xs mt-0.5 flex items-center">
                  <span className="text-white/60">Proposer:</span>
                  <span className="text-white/80 ml-1 font-medium">
                    {proposer_entity || (proposer_index ? `Validator ${proposer_index}` : 'Unknown')}
                  </span>
                </p>
              </div>
            </div>

            {/* Fee badge - if available */}
            {block_value !== undefined && (
              <div className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-green-400 text-sm font-mono flex items-center">
                <svg
                  className="w-3 h-3 mr-1 text-green-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 6V18M16 10L8 14M8 10L16 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {block_value.toFixed(4)} ETH
              </div>
            )}
          </div>

          {/* Key stats in a clean grid */}
          <div className="grid grid-cols-2 gap-0.5 my-1">
            {/* Execution block number */}
            <div className="flex flex-col p-3 bg-surface/5">
              <span className="text-xs text-white/50 uppercase tracking-wider">Block</span>
              <span className="text-sm font-medium text-amber-400 mt-1 font-mono">
                {execution_block_number || 'N/A'}
              </span>
            </div>

            {/* Transaction count */}
            <div className="flex flex-col p-3 bg-surface/5">
              <span className="text-xs text-white/50 uppercase tracking-wider">Transactions</span>
              <span className="text-sm font-medium text-amber-400 mt-1 font-mono">{txCount.toLocaleString()}</span>
            </div>

            {/* Blob count - only shown if there are blobs */}
            {blobsCount > 0 && (
              <div className="flex flex-col p-3 bg-surface/5">
                <span className="text-xs text-white/50 uppercase tracking-wider">Blobs</span>
                <span className="text-sm font-medium text-purple-400 mt-1 font-mono">{blobsCount}</span>
              </div>
            )}

            {/* Block hash */}
            <div className={`flex flex-col p-3 bg-surface/5 ${blobsCount > 0 ? '' : 'col-span-2'}`}>
              <span className="text-xs text-white/50 uppercase tracking-wider">Hash</span>
              <span className="text-sm font-medium text-white/70 mt-1 font-mono truncate">
                {formatHash(block_hash || execution_block_hash, 10, 10)}
              </span>
            </div>
          </div>

          {/* Block contents section */}
          <div className="px-4 pb-1 pt-2">
            <div className="mb-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-white/60">Block Contents</h4>
            </div>

            {/* Transaction section */}
            <div className="bg-surface/5 rounded-lg overflow-hidden mb-2">
              <div className="flex justify-between items-center p-3 border-b border-white/5">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-amber-500/10 rounded-sm flex items-center justify-center mr-2">
                    <svg
                      className="w-3 h-3 text-amber-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-amber-300">Transactions</span>
                </div>
                <span className="text-xs text-white/40 font-mono">{txCount} total</span>
              </div>

              {txCount > 0 ? (
                <div className="p-3">
                  {/* Transaction visualization - optimized for larger screens */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* Show sample transactions as dots organized in rows - larger grid */}
                    {Array.from({ length: Math.min(120, txCount) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: i % 5 === 0 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.5)',
                        }}
                      />
                    ))}

                    {/* Show overflow indicator if needed */}
                    {txCount > 120 && (
                      <div className="w-full mt-2 text-center">
                        <span className="text-xs text-amber-300/70 bg-amber-900/30 px-2 py-0.75 rounded">
                          +{txCount - 120} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-white/30 text-sm p-3">No transactions</div>
              )}
            </div>

            {/* Blob section */}
            {blobsCount > 0 && (
              <div className="bg-purple-900/10 border border-purple-500/10 rounded-lg overflow-hidden mb-3">
                <div className="flex justify-between items-center p-3 border-b border-purple-500/10">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-purple-500/10 rounded-sm flex items-center justify-center mr-2">
                      <svg
                        className="w-3 h-3 text-purple-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-purple-300">Blob Data</span>
                  </div>
                  <span className="text-xs text-purple-300/40 font-mono">
                    {blobsCount} blob{blobsCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-3">
                  {/* Blobs grid - larger for high-res screens */}
                  <div className="flex flex-wrap gap-2">
                    {/* Show blobs with 0-based indexing */}
                    {Array.from({ length: Math.min(18, blobsCount) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 bg-purple-500/15 border border-purple-500/30 rounded flex items-center justify-center shadow-inner hover:bg-purple-500/20 transition-colors duration-200"
                      >
                        <span className="text-sm text-purple-300/90 font-mono">{i}</span>
                      </div>
                    ))}

                    {/* Indicator for additional blobs */}
                    {blobsCount > 18 && (
                      <div className="flex items-center">
                        <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded flex items-center justify-center">
                          <span className="text-xs text-purple-300/70">+{blobsCount - 18}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeaconBlockVisualization;
