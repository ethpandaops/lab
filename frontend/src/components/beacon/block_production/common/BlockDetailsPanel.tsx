import React from 'react';
import { normalizeBlockData } from './blockDataNormalizer';
import BlockHeader from './BlockHeader';
import BlockContent from './BlockContent';
import { BlockData } from './types';

interface BlockDetailsPanelProps {
  slot: number;
  isCurrentSlot: boolean;
  isPast: boolean;
  isFuture: boolean;
  block?: BlockData;
  isBuilding: boolean;
  hasData: boolean;
  proposerEntity?: string;
  blockValue?: number;
  futureBidsCount?: number;
  futureBids?: Array<{
    value: number;
    relayName: string;
    builderName?: string;
  }>;
  isLocallyBuilt?: boolean;
}

/**
 * BlockDetailsPanel wraps all the components needed to display a block
 * This is the main container that handles the overall styling and layout
 */
const BlockDetailsPanel: React.FC<BlockDetailsPanelProps> = ({
  slot,
  isCurrentSlot,
  isPast,
  isFuture,
  block,
  isBuilding,
  hasData,
  proposerEntity,
  blockValue,
  futureBidsCount,
  futureBids,
  isLocallyBuilt = false,
}) => {
  // Normalize the block data to handle different field naming conventions
  const normalizedBlock = React.useMemo(() => normalizeBlockData(block), [block]);

  // Determine border and indicator colors based on slot position using app color system
  const getBorderColor = () => {
    if (isPast) return 'border-cyan-700/40';
    if (isCurrentSlot) return 'border-cyan-500/60';
    if (isFuture) return 'border-cyan-600/30';
    return 'border-border-subtle';
  };

  const getIndicatorColor = () => {
    if (isPast) return 'from-cyan-600 to-cyan-700';
    if (isCurrentSlot) return 'from-cyan-400 via-cyan-500 to-cyan-600';
    if (isFuture) return 'from-cyan-500 via-cyan-600 to-cyan-700';
    return 'from-cyan-600 to-cyan-700';
  };

  // Determine container size and style based on slot position
  const getContainerClasses = () => {
    if (isCurrentSlot) {
      return 'bg-slate-900 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(56,189,248,0.25)] w-full h-[280px] transition-all duration-300 relative';
    }

    if (isPast) {
      return 'bg-slate-900 rounded-lg overflow-hidden shadow-[0_0_10px_rgba(56,189,248,0.15)] w-full h-[140px] transition-all duration-300 relative';
    }

    if (isFuture) {
      return 'bg-slate-900 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(56,189,248,0.2)] w-full h-[140px] transition-all duration-300 relative';
    }

    return 'bg-slate-900 rounded-lg overflow-hidden shadow-md w-full h-[140px] transition-all duration-300 relative';
  };

  // If we don't have data and we're not in a special state, show a simplified version
  if (!hasData && !isBuilding && !isFuture) {
    return (
      <div className={`${getContainerClasses()} border ${getBorderColor()}`}>
        {/* Colored indicator at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getIndicatorColor()}`}></div>

        {/* Simple header with slot number */}
        <div className="px-4 pt-3 pb-2 border-b border-border-subtle">
          <div className="flex items-center">
            <div
              className={`${isPast ? 'bg-bg-surface' : 'bg-bg-surface'} px-2 py-1 rounded text-xs font-medium ${isPast ? 'text-text-primary' : 'text-text-primary'}`}
            >
              {isPast ? slot : `SLOT ${slot}`}
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="h-[calc(100%-2.5rem)] flex flex-col items-center justify-center space-y-3 text-text-tertiary">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-xs font-mono">No block data</p>
        </div>
      </div>
    );
  }

  // Handle case where normalized block is undefined but we expect data (isBuilding case)
  if (!normalizedBlock && (isBuilding || isFuture)) {
    // Create a minimal normalized block to pass to components
    const minimalBlock = {
      raw: block || {},
      // Add minimal required fields
      slot: slot,
      blockRoot: '',
      stateRoot: '',
    };

    return (
      <div className={`${getContainerClasses()} border ${getBorderColor()}`}>
        {/* Colored indicator at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getIndicatorColor()}`}></div>

        {/* Simple header */}
        <div className="p-4 flex flex-col border-b border-border-subtle">
          <div className="flex items-center">
            <div
              className={`${isPast ? 'bg-bg-surface' : 'bg-bg-surface'} px-2 py-1 rounded text-xs font-medium ${isPast ? 'text-text-primary' : 'text-text-primary'}`}
            >
              {isPast ? slot : `SLOT ${slot}`}
            </div>
          </div>
        </div>

        {/* Content - show building state or future bids */}
        <BlockContent
          blockData={minimalBlock}
          isBuilding={isBuilding}
          proposerEntity={proposerEntity}
          isPast={isPast}
          isCurrentSlot={isCurrentSlot}
          isFuture={isFuture}
          futureBids={futureBids}
          isLocallyBuilt={isLocallyBuilt}
        />
      </div>
    );
  }

  // No need for debug logging

  return (
    <div className={`${getContainerClasses()} border ${getBorderColor()}`}>
      {/* Colored indicator at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getIndicatorColor()}`}></div>

      {/* Block header section */}
      {normalizedBlock && (
        <BlockHeader
          blockData={normalizedBlock}
          slot={slot}
          isCurrentSlot={isCurrentSlot}
          isPast={isPast}
          isFuture={isFuture}
          proposerEntity={proposerEntity}
          blockValue={blockValue}
          futureBidsCount={futureBidsCount}
        />
      )}

      {/* Block content section - different for current, past, and future slots */}
      {normalizedBlock && (
        <BlockContent
          blockData={normalizedBlock}
          isBuilding={isBuilding}
          proposerEntity={proposerEntity}
          isPast={isPast}
          isCurrentSlot={isCurrentSlot}
          isFuture={isFuture}
          futureBids={futureBids}
          isLocallyBuilt={isLocallyBuilt}
        />
      )}
    </div>
  );
};

export default BlockDetailsPanel;
