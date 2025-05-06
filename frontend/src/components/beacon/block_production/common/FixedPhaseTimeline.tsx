import React, { useEffect, useRef, useState } from 'react';
import { Phase } from './types';
import { getCurrentPhase } from './PhaseUtils';

interface PhaseTimelineProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  slotData?: any;
  onPhaseChange?: (phase: Phase) => void;
}

/**
 * HARDCODED ANIMATION VERSION - Show a fake, pre-rendered animation of the timeline
 * by incrementing through a sequence of individual frames
 */
const FixedPhaseTimeline: React.FC<PhaseTimelineProps> = ({
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  slotData,
  onPhaseChange
}) => {
  // Generate 13 frames (0s to 12s)
  const FRAMES = Array.from({ length: 13 }).map((_, i) => i * 1000);
  const [frameIndex, setFrameIndex] = useState(0);
  const internalTime = FRAMES[frameIndex];
  
  // Animation effect - manually step through the frames with high frequency updates
  useEffect(() => {
    // Reset to frame 0
    setFrameIndex(0);
    
    // Use a higher frequency update (10ms) for smoother movement
    // This avoids using animations which can cause issues with timeline resetting
    const intervalId = setInterval(() => {
      setFrameIndex(current => {
        // Calculate the precise fractional position based on elapsed time
        const elapsedMs = (Date.now() % 12000); // Modulo 12 seconds in ms
        const framePosition = (elapsedMs / 1000); // Convert to seconds
        
        // Find the closest frame index
        return Math.min(12, Math.floor(framePosition));
      });
    }, 10); // Update every 10ms for smoother movement
    
    // Clean up
    return () => clearInterval(intervalId);
  }, []);
  
  // Calculate which attestation windows have already happened by the current time
  const filteredAttestationWindows = slotData?.attestations?.windows?.filter((window: any) => {
    return window.inclusionDelay !== undefined && (window.inclusionDelay * 1000) <= internalTime;
  }) || [];
  
  // Count attestations from windows that have occurred at or before the current time
  const attestationsCount = filteredAttestationWindows.reduce((total: number, window: any) => {
    return total + (window.validatorIndices?.length || 0);
  }, 0);
  
  // Get the maximum expected attestations (or default to 128)
  const totalExpectedAttestations = slotData?.attestations?.maximumVotes 
    ? Number(slotData.attestations.maximumVotes) 
    : 128;
    
  // Calculate the current phase
  const currentPhase = getCurrentPhase(
    internalTime, 
    nodeBlockSeen, 
    nodeBlockP2P, 
    blockTime,
    attestationsCount,
    totalExpectedAttestations
  );
  
  // Notify parent component about the current phase if callback is provided
  React.useEffect(() => {
    if (typeof onPhaseChange === 'function') {
      onPhaseChange(currentPhase);
    }
  }, [currentPhase, onPhaseChange]);

  // Calculate phase transition times
  let propagationTime = 5000; // Default 5s
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
  
  // Use earliest node time or block time if we have it
  if (earliestNodeTime !== Infinity) {
    propagationTime = earliestNodeTime;
  } else if (blockTime) {
    propagationTime = blockTime;
  }
  
  // Calculate the attestation phase time (1.5s after propagation starts)
  const attestationTime = propagationTime + 1500;
  
  // For the accepted phase, either use 66% attestation or a time-based fallback
  const acceptanceTime = attestationTime + 2000; // 2s after attestation phase starts

  // Get percentages for phase transitions (as portion of the 12s slot)
  const propagationPercent = Math.min(98, Math.max(2, (propagationTime / 12000) * 100));
  const attestationPercent = Math.min(98, Math.max(propagationPercent + 1, (attestationTime / 12000) * 100));
  const acceptancePercent = Math.min(98, Math.max(attestationPercent + 1, (acceptanceTime / 12000) * 100));

  return (
    <div className="bg-surface/40 rounded-t-xl shadow-lg overflow-hidden p-3 pb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col">
          <h3 className="text-base font-bold text-primary">Block Production Timeline</h3>
          <div className="text-xs mt-0.5 flex items-center">
            <span className="font-medium mr-1">Phase:</span>
            <span className={`font-medium px-1.5 py-0.5 rounded-full text-xs 
              ${currentPhase === Phase.Building ? 'bg-orange-500/20 text-orange-300' :
                currentPhase === Phase.Propagating ? 'bg-purple-500/20 text-purple-300' :
                currentPhase === Phase.Attesting ? 'bg-blue-500/20 text-blue-300' :
                'bg-green-500/20 text-green-300'}`}
            >
              {currentPhase === Phase.Building ? 'Building' :
                currentPhase === Phase.Propagating ? 'Propagating' :
                currentPhase === Phase.Attesting ? 'Attesting' :
                'Accepted'}
              
              {currentPhase === Phase.Attesting && (
                <span className="ml-1">
                  {(() => {
                    // Calculate the actual percentage based on attestations received so far
                    const percentage = totalExpectedAttestations > 0 ? 
                      Math.round((attestationsCount / totalExpectedAttestations) * 100) : 0;
                    return `(${percentage}%)`;
                  })()}
                </span>
              )}
            </span>
            <span className="ml-auto font-mono text-sm text-white">
              {(internalTime / 1000).toFixed(1)}s
            </span>
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
            width: `${(internalTime / 12000) * 100}%`,
            maxWidth: 'calc(100% - 4px)', // Stay within container boundaries
            willChange: 'width', // Performance hint to browser
          }}
        />
        
        {/* Current time indicator with glowing dot - no transitions for crisp movement */}
        <div 
          className="absolute top-0 h-3" 
          style={{ 
            left: `calc(${(internalTime / 12000) * 100}%)`,
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

export default FixedPhaseTimeline;