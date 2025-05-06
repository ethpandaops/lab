import React from 'react';
import { isInPropagationPhase } from '../common/PhaseUtils';

interface MobileTimelineBarProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
}

const MobileTimelineBar: React.FC<MobileTimelineBarProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime
}) => {
  return (
    <div className="bg-surface/40 rounded-t-xl shadow-lg overflow-hidden p-3 pb-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h3 className="text-base font-bold text-primary">Block Production Timeline</h3>
          <div className="text-xs mt-0.5">
            Phase: <span 
              className={`font-medium px-1.5 py-0.5 rounded-full ${
                isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P) 
                  ? 'bg-purple-500/20 text-purple-300' 
                  : 'bg-orange-500/20 text-orange-300'
              }`}
            >
              {isInPropagationPhase(currentTime, nodeBlockSeen, nodeBlockP2P) ? 'Propagating' : 'Building'}
            </span>
          </div>
        </div>
        <div className="font-mono text-sm text-white">{(currentTime / 1000).toFixed(1)}s</div>
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