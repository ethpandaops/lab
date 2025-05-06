import React from 'react';
import { Phase } from './types';
import { getCurrentPhase } from './PhaseUtils';

interface PhaseTimelineProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  slotData?: any;
  onPhaseChange?: (phase: Phase) => void;
  
  // Navigation controls
  slotNumber: number | null;
  headLagSlots: number;
  displaySlotOffset: number;
  isPlaying: boolean;
  isMobile: boolean;
  goToPreviousSlot: () => void;
  goToNextSlot: () => void;
  resetToCurrentSlot: () => void;
  togglePlayPause: () => void;
  isNextDisabled: boolean;
}

const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  slotData,
  onPhaseChange,
  // Navigation controls
  slotNumber,
  headLagSlots,
  displaySlotOffset,
  isPlaying,
  isMobile,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  togglePlayPause,
  isNextDisabled
}) => {
  // CRITICAL FIX: Use startMs/endMs instead of inclusionDelay!
  // Calculate which attestation windows have already happened by the current time
  const filteredAttestationWindows = slotData?.attestations?.windows?.filter((window: any) => {
    // Convert bigint to number
    const startMs = window.startMs ? Number(window.startMs) : Infinity;
                
    // Check if this window is before the current time using startMs
    return startMs <= currentTime;
  }) || [];
  
  // Count attestations from windows that have occurred at or before the current time
  const attestationsCount = filteredAttestationWindows.reduce((total: number, window: any) => {
    const validators = window.validatorIndices?.length || 0;
    return total + validators;
  }, 0);
  
  // Get the maximum expected attestations
  const totalExpectedAttestations = 
    slotData?.attestations?.maximumVotes 
      ? Number(slotData.attestations.maximumVotes) 
      : 0; // Don't use default value, use real data only
    
  // Calculate the current phase
  const currentPhase = getCurrentPhase(
    currentTime, 
    nodeBlockSeen, 
    nodeBlockP2P, 
    blockTime,
    attestationsCount,
    totalExpectedAttestations
  );
  
  // Notify parent component about the current phase if callback is provided
  React.useEffect(() => {
    if (typeof onPhaseChange === 'function' && currentPhase !== null) {
      onPhaseChange(currentPhase);
    }
  }, [currentPhase, onPhaseChange]);

  // REQUIREMENT 1: If we don't have a phase, use Building phase instead of showing "Waiting for data..."
  // This prevents the "Waiting for data..." message at the start of slots
  if (currentPhase === null) {
    // Use Building phase by default instead of showing "Waiting for data..."
    return (
      <div className="bg-surface/40 rounded-t-xl shadow-lg overflow-hidden p-2 pb-3">
        <div className="flex justify-between items-center mb-2">
          {/* Navigation controls on the left */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousSlot}
              className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
              title="Previous Slot"
            >
              <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <button
              onClick={resetToCurrentSlot}
              className={`px-2 py-1 rounded border font-medium text-xs ${displaySlotOffset === 0
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-surface/50 border-subtle text-secondary hover:bg-hover'
                } transition`}
              disabled={displaySlotOffset === 0}
              title="Return to Current Slot"
            >
              Live
            </button>

            <button
              onClick={goToNextSlot}
              className={`bg-surface/50 p-1.5 rounded border border-subtle transition ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
                }`}
              disabled={isNextDisabled}
              title="Next Slot"
            >
              <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <div className={`font-mono ml-1 text-primary flex flex-col ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div className="text-lg font-semibold">Slot: {slotNumber ?? "—"}</div>
              {slotNumber !== null && displaySlotOffset !== 0 && (
                <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-secondary opacity-70`}>
                  Lag: {headLagSlots - displaySlotOffset}
                </div>
              )}
            </div>
          </div>

          {/* Phase info and time on the right */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-medium mr-1.5 text-base">Phase:</span>
                <span className="font-medium px-2.5 py-0.5 rounded-full text-base bg-orange-500/20 text-orange-300">
                  Building
                </span>
              </div>
            </div>
            
            {/* Time display */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-white">{(currentTime / 1000).toFixed(1)}s</span>
              <button
                onClick={togglePlayPause}
                className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="relative mt-2">
          {/* Empty timeline bar - but colored for building phase */}
          <div className="h-3 mb-2 rounded-lg overflow-hidden border border-subtle shadow-inner bg-surface/30 relative">
            {/* Building phase colored background */}
            <div className="h-full bg-orange-500/15 w-full"></div>
          </div>
          
          {/* Progress overlay - showing time with building phase color */}
          <div 
            className="absolute top-0 h-3 bg-orange-500/30 rounded-l-lg border-r-2 border-white/40"
            style={{ 
              width: `${(currentTime / 12000) * 100}%`,
              maxWidth: 'calc(100% - 4px)', // Stay within container boundaries
              willChange: 'width' // Performance hint
            }}
          />
          
          {/* Current time indicator with glowing dot */}
          <div 
            className="absolute top-0 h-3"
            style={{ 
              left: `${(currentTime / 12000) * 100}%`,
              transform: 'translateX(-50%)',
              willChange: 'left' // Performance hint
            }}
          >
            <div 
              className="w-5 h-5 bg-white rounded-full -translate-y-1/3 opacity-50"
              style={{
                boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.5), 0 0 20px 5px rgba(255, 255, 255, 0.3)'
              }}
            ></div>
          </div>
          
          {/* Time markers with ticks */}
          <div className="flex justify-between mt-1 px-1 relative">
            {[0, 2, 4, 6, 8, 10, 12].map(seconds => (
              <div key={seconds} className="relative flex flex-col items-center">
                <div className="w-px h-1.5 bg-white/20 mb-0.5"></div>
                <span className="font-mono text-[10px] text-tertiary/70">{seconds}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate phase transition times - ONLY based on real data, no defaults
  let propagationTime = Infinity;
  let earliestNodeTime = Infinity;
  
  // REQUIREMENT 2: Find the earliest time any node saw the block
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
  
  // Use block time if it's earlier than any node sightings
  if (blockTime !== undefined && 
     (earliestNodeTime === Infinity || blockTime < earliestNodeTime)) {
    earliestNodeTime = blockTime;
  }
  
  propagationTime = earliestNodeTime;
  
  // REQUIREMENT 3: Find the earliest attestation time
  let attestationTime = Infinity;
  if (slotData?.attestations?.windows && Array.isArray(slotData.attestations.windows)) {
    // Find the earliest attestation window
    slotData.attestations.windows.forEach((window: any) => {
      if (window.startMs !== undefined) {
        // Use startMs directly
        const windowTime = Number(window.startMs);
        if (windowTime < attestationTime) {
          attestationTime = windowTime;
        }
      }
    });
  }
  
  // REQUIREMENT 4: Determine acceptance time (66% attestations)
  let acceptanceTime = Infinity;
  if (totalExpectedAttestations > 0) {
    const threshold = Math.ceil(totalExpectedAttestations * 0.66);
    
    let cumulativeAttestations = 0;
    
    // Sort windows by time using startMs instead of inclusionDelay
    const sortedWindows = [...(slotData?.attestations?.windows || [])].sort((a, b) => {
      return Number(a.startMs || Infinity) - Number(b.startMs || Infinity);
    });
    
    // Find the window when we reach 66%
    for (const window of sortedWindows) {
      if (window.startMs !== undefined && window.validatorIndices?.length) {
        const validatorCount = window.validatorIndices.length;
        cumulativeAttestations += validatorCount;
        
        if (cumulativeAttestations >= threshold) {
          acceptanceTime = Number(window.startMs);
          break;
        }
      }
    }
  }
  
  // Set defaults for values we don't have
  if (propagationTime === Infinity) {
    // If we don't have propagation time, estimate 1/3 into slot
    propagationTime = 4000;
  }
  
  if (attestationTime === Infinity) {
    // If we don't have attestation time, estimate based on propagation
    attestationTime = propagationTime + 1500;
  }
  
  if (acceptanceTime === Infinity) {
    // If we don't have acceptance time, estimate based on attestation
    acceptanceTime = attestationTime + 2000;
  }

  // Get percentages for phase transitions (as portion of the 12s slot)
  const propagationPercent = Math.min(98, Math.max(2, (propagationTime / 12000) * 100));
  const attestationPercent = Math.min(98, Math.max(propagationPercent + 1, (attestationTime / 12000) * 100));
  const acceptancePercent = Math.min(98, Math.max(attestationPercent + 1, (acceptanceTime / 12000) * 100));

  return (
    <div className="bg-surface/40 rounded-t-xl shadow-lg overflow-hidden p-2 pb-3">
      <div className="flex justify-between items-center mb-2">
        {/* Navigation controls on the left */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousSlot}
            className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
            title="Previous Slot"
          >
            <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            onClick={resetToCurrentSlot}
            className={`px-2 py-1 rounded border font-medium text-xs ${displaySlotOffset === 0
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'bg-surface/50 border-subtle text-secondary hover:bg-hover'
              } transition`}
            disabled={displaySlotOffset === 0}
            title="Return to Current Slot"
          >
            Live
          </button>

          <button
            onClick={goToNextSlot}
            className={`bg-surface/50 p-1.5 rounded border border-subtle transition ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
              }`}
            disabled={isNextDisabled}
            title="Next Slot"
          >
            <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          <div className={`font-mono ml-1 text-primary flex flex-col ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="text-lg font-semibold">Slot: {slotNumber ?? "—"}</div>
            {slotNumber !== null && displaySlotOffset !== 0 && (
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-secondary opacity-70`}>
                Lag: {headLagSlots - displaySlotOffset}
              </div>
            )}
          </div>
        </div>

        {/* Phase info and time on the right */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="font-medium mr-1.5 text-base">Phase:</span>
              <span className={`font-medium px-2.5 py-0.5 rounded-full text-base 
                ${currentPhase === Phase.Building ? 'bg-orange-500/20 text-orange-300' :
                  currentPhase === Phase.Propagating ? 'bg-purple-500/20 text-purple-300' :
                  currentPhase === Phase.Attesting ? 'bg-blue-500/20 text-blue-300' :
                  'bg-green-500/20 text-green-300'}`}
              >
                {currentPhase === Phase.Building ? 'Building' :
                  currentPhase === Phase.Propagating ? 'Propagating' :
                  currentPhase === Phase.Attesting ? 'Attesting' :
                  'Accepted'}
              </span>
            </div>
          </div>
          
          {/* Time display */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold text-white">{(currentTime / 1000).toFixed(1)}s</span>
            <button
              onClick={togglePlayPause}
              className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative mt-2">
        {/* Four-phase progress bar: Building → Propagating → Attesting → Accepted */}
        <div className="h-3 mb-2 flex rounded-lg overflow-hidden border border-subtle shadow-inner relative">
          {/* Building phase */}
          <div 
            className="border-r border-white/10 shadow-inner" 
            style={{ 
              width: `${propagationPercent}%`,
              backgroundColor: currentPhase === Phase.Building
                ? 'rgba(249, 115, 22, 0.4)' // brighter orange when active
                : 'rgba(249, 115, 22, 0.15)' // faded orange when inactive
            }}
          />
          
          {/* Propagating phase */}
          <div 
            className="border-r border-white/10 shadow-inner"
            style={{ 
              width: `${attestationPercent - propagationPercent}%`,
              backgroundColor: currentPhase === Phase.Propagating
                ? 'rgba(168, 85, 247, 0.4)' // brighter purple when active
                : 'rgba(168, 85, 247, 0.15)' // faded purple when inactive
            }}
          />
          
          {/* Attesting phase */}
          <div 
            className="border-r border-white/10 shadow-inner"
            style={{ 
              width: `${acceptancePercent - attestationPercent}%`,
              backgroundColor: currentPhase === Phase.Attesting
                ? 'rgba(59, 130, 246, 0.4)' // brighter blue when active
                : 'rgba(59, 130, 246, 0.15)' // faded blue when inactive
            }}
          />
          
          {/* Accepted phase */}
          <div 
            className="shadow-inner"
            style={{ 
              width: `${100 - acceptancePercent}%`,
              backgroundColor: currentPhase === Phase.Accepted
                ? 'rgba(34, 197, 94, 0.4)' // brighter green when active
                : 'rgba(34, 197, 94, 0.15)' // faded green when inactive
            }}
          />
          
          {/* Phase transition markers - no transitions for crisp movement */}
          <div 
            className="absolute top-0 bottom-0 w-1" 
            style={{
              left: `${propagationPercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
            }}
          />
          <div 
            className="absolute top-0 bottom-0 w-1" 
            style={{
              left: `${attestationPercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
            }}
          />
          <div 
            className="absolute top-0 bottom-0 w-1" 
            style={{
              left: `${acceptancePercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
            }}
          />
        </div>
        
        {/* Progress overlay - using linear time progression with no transitions */}
        <div 
          className="absolute top-0 h-3 bg-active/30 rounded-l-lg border-r-2 border-white"
          style={{ 
            width: `${(currentTime / 12000) * 100}%`,
            maxWidth: 'calc(100% - 4px)', // Stay within container boundaries
            willChange: 'width', // Performance hint to browser
          }}
        />
        
        {/* Current time indicator with glowing dot - no transitions for crisp movement */}
        <div 
          className="absolute top-0 h-3" 
          style={{ 
            left: `calc(${(currentTime / 12000) * 100}%)`,
            transform: 'translateX(-50%)',
            willChange: 'left', // Performance hint to browser
          }}
        >
          <div 
            className="w-5 h-5 bg-white rounded-full -translate-y-1/3 opacity-90"
            style={{
              boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.8), 0 0 20px 5px rgba(255, 255, 255, 0.4)',
            }}
          ></div>
        </div>
        
        {/* Time markers with ticks */}
        <div className="flex justify-between mt-1 px-1 relative">
          {[0, 2, 4, 6, 8, 10, 12].map(seconds => (
            <div key={seconds} className="relative flex flex-col items-center">
              <div className="w-px h-1.5 bg-white/20 mb-0.5"></div>
              <span className="font-mono text-[10px] text-tertiary/70">{seconds}s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhaseTimeline;