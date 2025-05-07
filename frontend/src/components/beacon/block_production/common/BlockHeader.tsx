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
    if (isPast) return 'bg-surface/50';
    if (isCurrentSlot) return 'bg-surface/70';
    if (isFuture) return 'bg-surface/50';
    return 'bg-surface/50';
  };

  const getHeaderTextColor = () => {
    if (isPast) return 'text-text-primary';
    if (isCurrentSlot) return 'text-text-primary';
    if (isFuture) return 'text-text-primary';
    return 'text-text-primary';
  };

  // Calculate epoch from slot number
  const epoch = Math.floor(slot / 32);

  return (
    <div className="p-4 flex flex-col border-b border-border-subtle">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-bg-surface-raised rounded-lg flex items-center justify-center mr-2 relative overflow-hidden">
            {/* Animated pulse in the background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-muted/20 to-accent/5 animate-pulse"></div>

            <svg
              className="w-4 h-4 text-accent-muted relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16 8H8M16 12H8M16 16H8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline flex-wrap gap-2">
              {/* For all blocks, just show the slot number directly */}
              <span className="text-lg font-mono font-bold text-text-primary">{slot}</span>

              {/* Epoch as subtitle - Only show for current or future blocks */}
              {!isPast && (
                <div className="bg-bg-surface-raised px-2 py-0.5 rounded text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  EPOCH {epoch}
                </div>
              )}

              {/* Block Version - Try to get from any available source */}
              {(blockData?.blockVersion || blockData?.raw?.block_version || blockData?.raw?.blockVersion) && (
                <div className="ml-auto bg-cyber-neon/10 px-2 py-0.5 rounded text-xs font-semibold text-cyber-neon uppercase tracking-wide">
                  {blockData?.blockVersion || blockData?.raw?.block_version || blockData?.raw?.blockVersion}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Value badge */}
        {blockValue !== undefined && blockValue > 0 ? (
          <div className="px-2 py-1 bg-success/10 rounded-lg text-success text-sm font-mono flex items-center relative overflow-hidden group">
            <svg
              className="w-3.5 h-3.5 mr-1 text-success relative z-10"
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
            <span className="relative z-10 font-semibold">{blockValue.toFixed(4)} ETH</span>
          </div>
        ) : futureBidsCount && futureBidsCount > 0 ? (
          <div className="text-xs bg-bg-surface-raised px-2 py-0.5 rounded text-text-secondary font-mono font-medium">
            {futureBidsCount} bid{futureBidsCount !== 1 ? 's' : ''}
          </div>
        ) : null}
      </div>

      {/* State Root & Block Proposer - Only show for current and future blocks AND when we have a block */}
      {!isPast && (blockData?.blockRoot || blockData?.executionPayloadBlockHash) && (
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center">
            <span className="text-text-tertiary mr-1">State Root:</span>
            <span className="text-text-secondary font-mono">
              {formatHash(blockData?.stateRoot)}
            </span>
          </div>

          {proposerEntity && (
            <div className="flex items-center">
              <span className="text-text-tertiary mr-1">Proposer:</span>
              <span className="text-text-secondary font-medium">{proposerEntity}</span>
            </div>
          )}
        </div>
      )}

      {/* Block Size - Only show for current and future blocks AND when we have a block */}
      {!isPast && (blockData?.blockRoot || blockData?.executionPayloadBlockHash) && (
        <div className="flex justify-between items-center text-xs mt-1">
          <div className="flex items-center">
            <span className="text-text-tertiary mr-1">Size:</span>
            <span className="text-text-secondary font-mono">
              {blockData?.blockTotalBytes
                ? `${(blockData.blockTotalBytes / 1024).toFixed(1)} KB`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* For past blocks, we'll move the blob and transaction count to BlockContent, so removing this section */}
      {isPast && <div></div>}
    </div>
  );
};

export default BlockHeader;
