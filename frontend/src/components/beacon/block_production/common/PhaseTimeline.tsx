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
}

const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  slotData,
  onPhaseChange
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
  
  // Calculate the current phase for display
  
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
      <div className="bg-surface/40 rounded-t-xl shadow-lg overflow-hidden p-3 pb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-primary">Block Production Timeline</h3>
            <div className="text-xs mt-0.5 flex items-center">
              <span className="font-medium mr-1">Phase:</span>
              <span className="font-medium px-1.5 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-300">
                Building
              </span>
              <span className="ml-auto font-mono text-sm text-white">
                {(currentTime / 1000).toFixed(1)}s
              </span>
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
              maxWidth: 'calc(100% - 4px)' // Stay within container boundaries
            }}
          />
          
          {/* Current time indicator with glowing dot */}
          <div 
            className="absolute top-0 h-3"
            style={{ 
              left: `${(currentTime / 12000) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div 
              className="w-5 h-5 bg-white rounded-full transform -translate-y-1/3 opacity-50"
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
              
              {/* REQUIREMENT 3: Show attestation percentage in the attestation phase */}
              {currentPhase === Phase.Attesting && totalExpectedAttestations > 0 && (
                <span className="ml-1">
                  {(() => {
                    // Count attestations that have been included up to the current time
                    let visibleAttestationsCount = 0;
                    if (slotData?.attestations?.windows && Array.isArray(slotData.attestations.windows)) {
                      slotData.attestations.windows.forEach((window: any) => {
                        if (window.inclusionDelay !== undefined && 
                            window.inclusionDelay * 1000 <= currentTime && 
                            window.validatorIndices?.length) {
                          visibleAttestationsCount += window.validatorIndices.length;
                        }
                      });
                    }
                    
                    // Calculate percentage
                    const percentage = Math.min(100, Math.round((visibleAttestationsCount / totalExpectedAttestations) * 100));
                    return `(${percentage}%)`;
                  })()}
                </span>
              )}
            </span>
            <span className="ml-auto font-mono text-sm text-white">
              {(currentTime / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
      
      <div className="relative mt-2">
        {/* Four-phase progress bar: Building → Propagating → Attesting → Accepted */}
        <div className="h-3 mb-2 flex rounded-lg overflow-hidden border border-subtle shadow-inner relative">
          {/* Building phase */}
          <div 
            className="border-r border-white/10 transition-colors duration-300 shadow-inner" 
            style={{ 
              width: `${propagationPercent}%`,
              backgroundColor: currentPhase === Phase.Building
                ? 'rgba(249, 115, 22, 0.4)' // brighter orange when active
                : 'rgba(249, 115, 22, 0.15)' // faded orange when inactive
            }}
          />
          
          {/* Propagating phase */}
          <div 
            className="border-r border-white/10 transition-colors duration-300 shadow-inner"
            style={{ 
              width: `${attestationPercent - propagationPercent}%`,
              backgroundColor: currentPhase === Phase.Propagating
                ? 'rgba(168, 85, 247, 0.4)' // brighter purple when active
                : 'rgba(168, 85, 247, 0.15)' // faded purple when inactive
            }}
          />
          
          {/* Attesting phase */}
          <div 
            className="border-r border-white/10 transition-colors duration-300 shadow-inner"
            style={{ 
              width: `${acceptancePercent - attestationPercent}%`,
              backgroundColor: currentPhase === Phase.Attesting
                ? 'rgba(59, 130, 246, 0.4)' // brighter blue when active
                : 'rgba(59, 130, 246, 0.15)' // faded blue when inactive
            }}
          />
          
          {/* Accepted phase */}
          <div 
            className="transition-colors duration-300 shadow-inner"
            style={{ 
              width: `${100 - acceptancePercent}%`,
              backgroundColor: currentPhase === Phase.Accepted
                ? 'rgba(34, 197, 94, 0.4)' // brighter green when active
                : 'rgba(34, 197, 94, 0.15)' // faded green when inactive
            }}
          />
          
          {/* Phase transition markers */}
          <div 
            className="absolute top-0 bottom-0 w-1 transition-colors duration-300" 
            style={{
              left: `${propagationPercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
            }}
          />
          <div 
            className="absolute top-0 bottom-0 w-1 transition-colors duration-300" 
            style={{
              left: `${attestationPercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
            }}
          />
          <div 
            className="absolute top-0 bottom-0 w-1 transition-colors duration-300" 
            style={{
              left: `${acceptancePercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
            }}
          />
        </div>
        
        {/* Progress overlay */}
        <div 
          className="absolute top-0 h-3 bg-active/30 rounded-l-lg border-r-2 border-white"
          style={{ 
            width: `${(currentTime / 12000) * 100}%`,
            maxWidth: 'calc(100% - 4px)' // Stay within container boundaries
          }}
        />
        
        {/* Current time indicator with glowing dot */}
        <div 
          className="absolute top-0 h-3"
          style={{ 
            left: `${(currentTime / 12000) * 100}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div 
            className="w-5 h-5 bg-white rounded-full transform -translate-y-1/3 opacity-90"
            style={{
              boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.8), 0 0 20px 5px rgba(255, 255, 255, 0.4)'
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