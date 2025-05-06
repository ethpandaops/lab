import React from 'react';
import { isInPropagationPhase } from '../common/PhaseUtils';

interface MobileTimelineBarProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  
  // Navigation controls
  slotNumber: number | null;
  headLagSlots: number;
  displaySlotOffset: number;
  isPlaying: boolean;
  goToPreviousSlot: () => void;
  goToNextSlot: () => void;
  resetToCurrentSlot: () => void;
  togglePlayPause: () => void;
  isNextDisabled: boolean;
}

const MobileTimelineBar: React.FC<MobileTimelineBarProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  // Navigation controls
  slotNumber,
  headLagSlots,
  displaySlotOffset,
  isPlaying,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  togglePlayPause,
  isNextDisabled
}) => {
  return (
    <div className="p-3 pb-4">
      <div className="flex justify-between items-center mb-2">
        {/* Slot navigation on the left */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPreviousSlot}
            className="bg-surface p-1 rounded border border-subtle hover:bg-hover transition"
            title="Previous Slot"
          >
            <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            onClick={resetToCurrentSlot}
            className={`px-1.5 py-0.5 rounded border font-medium text-xs ${displaySlotOffset === 0
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'bg-surface border-subtle text-secondary hover:bg-hover'
              } transition`}
            disabled={displaySlotOffset === 0}
            title="Return to Current Slot"
          >
            Live
          </button>

          <button
            onClick={goToNextSlot}
            className={`bg-surface p-1 rounded border border-subtle transition ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
              }`}
            disabled={isNextDisabled}
            title="Next Slot"
          >
            <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Slot number centered */}
        <div className="font-mono text-xs text-primary">
          Slot: {slotNumber ?? "—"}
        </div>

        {/* Play/Pause on the right */}
        <button
          onClick={togglePlayPause}
          className="bg-surface p-1 rounded border border-subtle hover:bg-hover transition"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
      </div>
      
      {/* Phase and time info */}
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center text-xs">
          <span className="mr-1">Phase:</span>
          <span 
            className={`font-medium px-1.5 py-0.5 rounded-full ${
              isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P) 
                ? 'bg-purple-500/20 text-purple-300' 
                : 'bg-orange-500/20 text-orange-300'
            }`}
          >
            {isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P) ? 'Propagating' : 'Building'}
          </span>
        </div>
        <div className="font-mono text-xs text-white">{(currentTime / 1000).toFixed(1)}s</div>
      </div>
      
      <div className="relative pt-2 pb-4">
        {/* Two-phase progress bar: Building and Propagating */}
        <div className="h-2 mb-2 flex rounded-lg overflow-hidden border border-subtle relative">
          {/* Calculate transition time */}
          {(() => {
            let transitionTime = 5000; // Default
            let earliestNodeTime = Infinity;
            
            // Look for earliest node time in the data
            Object.values(nodeBlockSeen).forEach(time => {
              if (typeof time === 'number') {
                earliestNodeTime = Math.min(earliestNodeTime, time);
              }
            });
            
            Object.values(nodeBlockP2P).forEach(time => {
              if (typeof time === 'number') {
                earliestNodeTime = Math.min(earliestNodeTime, time);
              }
            });
            
            // Use earliest node time if we have it, otherwise default
            if (earliestNodeTime !== Infinity) {
              transitionTime = earliestNodeTime;
            } else if (blockTime) {
              transitionTime = blockTime;
            }
            
            // Calculate the percentage for transition (as portion of the 12s slot)
            const transitionPercent = Math.min(98, Math.max(2, (transitionTime / 12000) * 100));
            const isInPropagation = isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P);
            
            return (
              <>
                {/* Building phase - dynamic width based on transition time */}
                <div 
                  className="border-r border-white/5 transition-colors duration-300" 
                  style={{ 
                    width: `${transitionPercent}%`,
                    backgroundColor: isInPropagation
                      ? 'rgba(249, 115, 22, 0.1)' // faded orange when inactive
                      : 'rgba(249, 115, 22, 0.3)' // brighter orange when active
                  }}
                />
                {/* Propagating phase - dynamic width based on transition time */}
                <div 
                  className="transition-colors duration-300"
                  style={{ 
                    width: `${100 - transitionPercent}%`,
                    backgroundColor: isInPropagation
                      ? 'rgba(168, 85, 247, 0.3)' // brighter purple when active
                      : 'rgba(168, 85, 247, 0.1)' // faded purple when inactive
                  }}
                />
                
                {/* Phase transition marker */}
                <div 
                  className="absolute top-0 bottom-0 w-[3px] transition-colors duration-300" 
                  style={{
                    left: `${transitionPercent}%`,
                    backgroundColor: isInPropagation
                      ? 'rgba(255, 255, 255, 0.6)' // brighter when we've passed the transition
                      : 'rgba(255, 255, 255, 0.2)' // dimmer before transition
                  }}
                />
              </>
            );
          })()}
        </div>
        
        {/* Progress overlay on phases - using linear time progression */}
        <div 
          className="absolute top-2 left-0 h-2 bg-active/20 transition-width duration-100 rounded-l-lg"
          style={{ 
            width: `${(currentTime / 12000) * 100}%`,
            maxWidth: '100%' // Stay within container boundaries
          }}
        />
        
        {/* Current time slider indicator - prominently displayed */}
        <div 
          className="absolute top-2 h-2 bg-active/80 transition-all duration-100"
          style={{ 
            left: `${(currentTime / 12000) * 100}%`,
            width: '2px',
            boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.5)'
          }}
        >
          <div 
            className="absolute top-0 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-70"
            style={{
              boxShadow: '0 0 6px 2px rgba(255, 255, 255, 0.8)'
            }}
          ></div>
        </div>
        
        {/* Time markers */}
        <div className="flex justify-between text-[9px] font-mono text-tertiary/60 px-1">
          <span>0s</span>
          <span>4s</span>
          <span>8s</span>
          <span>12s</span>
        </div>
      </div>
    </div>
  );
};

export default MobileTimelineBar;