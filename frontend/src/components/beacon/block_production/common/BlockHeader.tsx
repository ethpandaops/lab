import React from 'react';
import { NormalizedBlockData, formatHash } from './blockDataNormalizer';

interface BlockHeaderProps {
  blockData: NormalizedBlockData;
  slot: number;
  isCurrentSlot: boolean;
  isPast: boolean;
  isFuture: boolean;
  proposerEntity?: string;
  blockValue?: number;
  futureBidsCount?: number;
}

/**
 * BlockHeader displays the header section of a block
 * with slot number, block value, and key metadata
 */
const BlockHeader: React.FC<BlockHeaderProps> = ({
  blockData,
  slot,
  isCurrentSlot,
  isPast,
  isFuture,
  proposerEntity,
  blockValue,
  futureBidsCount,
}) => {
  // Determine header styles based on slot position (past, current, future)
  const getHeaderBgColor = () => {
    if (isPast) return 'bg-gold/5';
    if (isCurrentSlot) return 'bg-gold/10';
    if (isFuture) return 'bg-blue-500/5';
    return 'bg-white/5';
  };

  const getHeaderTextColor = () => {
    if (isPast) return 'text-gold/80';
    if (isCurrentSlot) return 'text-gold/90';
    if (isFuture) return 'text-blue-400/80';
    return 'text-white/80';
  };

  // Calculate epoch from slot number
  const epoch = Math.floor(slot / 32);
  
  return (
    <div className="p-4 flex flex-col border-b border-gold/20">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center mr-2 relative overflow-hidden">
            {/* Animated pulse in the background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-gold/30 to-amber-500/5 animate-pulse"></div>
            
            <svg className="w-4 h-4 text-gold/90 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M16 8H8M16 12H8M16 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline flex-wrap gap-2">
              <div className={`${getHeaderBgColor()} px-2 py-0.5 rounded text-xs font-semibold ${getHeaderTextColor()} uppercase tracking-wide`}>
                SLOT
              </div>
              <span className="text-lg font-mono font-bold text-gold/90">{slot}</span>
              
              {/* Block Version - Always show "DENEB" for current network version */}
              <div className="bg-purple-500/10 px-2 py-0.5 rounded text-xs font-semibold text-purple-400/90 uppercase tracking-wide">
                DENEB
              </div>
              
              {/* Epoch - calculated from slot number */}
              <div className="bg-blue-500/10 px-2 py-0.5 rounded text-xs font-semibold text-blue-400/90 uppercase tracking-wide">
                EPOCH {epoch}
              </div>
            </div>
          </div>
        </div>
        
        {/* Value badge */}
        {(blockValue !== undefined && blockValue > 0) ? (
          <div className="px-2 py-1 bg-green-500/5 rounded-lg text-green-400/90 text-sm font-mono flex items-center relative overflow-hidden group">
            <svg className="w-3.5 h-3.5 mr-1 text-green-400/80 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6V18M16 10L8 14M8 10L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="relative z-10 font-semibold">{blockValue.toFixed(4)} ETH</span>
          </div>
        ) : futureBidsCount && futureBidsCount > 0 ? (
          <div className="text-xs bg-blue-500/5 px-2 py-0.5 rounded text-blue-400/90 font-mono font-medium">
            {futureBidsCount} bid{futureBidsCount !== 1 ? 's' : ''}
          </div>
        ) : null}
      </div>
      
      {/* State Root & Block Proposer */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center">
          <span className="text-white/50 mr-1">State Root:</span>
          <span className="text-yellow-300/90 font-mono">
            {formatHash(blockData?.stateRoot, 6, 6)}
          </span>
        </div>
        
        {proposerEntity && (
          <div className="flex items-center">
            <span className="text-white/50 mr-1">Proposer:</span>
            <span className="text-white/80 font-medium">{proposerEntity}</span>
          </div>
        )}
      </div>
      
      {/* Block Size */}
      <div className="flex justify-between items-center text-xs mt-1">
        <div className="flex items-center">
          <span className="text-white/50 mr-1">Size:</span>
          <span className="text-indigo-300/90 font-mono">
            {blockData?.blockTotalBytes
              ? `${(blockData.blockTotalBytes / 1024).toFixed(1)} KB${
                  blockData.blockTotalBytesCompressed 
                    ? ` (${(blockData.blockTotalBytesCompressed / 1024).toFixed(1)} KB compressed)` 
                    : ''
                }`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BlockHeader;