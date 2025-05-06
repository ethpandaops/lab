import React from 'react';
import { Phase } from './types';
import { getCurrentPhase } from './PhaseUtils';
import { countUniqueBuilderPubkeys } from './utils';

interface PhaseIconsProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  bids: Array<{
    relayName: string;
    value: number;
    time: number;
    blockHash?: string;
    builderPubkey?: string;
    isWinning?: boolean;
  }>;
  winningBid?: {
    relayName: string;
    value: number;
  } | null;
  proposer?: {
    proposerValidatorIndex?: number;
  };
  nodes?: Record<string, any>;
  slotData?: any;
  firstContinentToSeeBlock?: string | null;
}

const PhaseIcons: React.FC<PhaseIconsProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  bids,
  winningBid,
  proposer,
  nodes = {},
  slotData,
  firstContinentToSeeBlock
}) => {
  // Get attestation data for phase calculation - using startMs instead of inclusionDelay
  const attestationsCount = slotData?.attestations?.windows.reduce((total: number, window: any) => {
    // CRITICAL FIX: Use startMs instead of inclusionDelay
    if (window.startMs !== undefined && Number(window.startMs) <= currentTime) {
      return total + (window.validatorIndices?.length || 0);
    }
    return total;
  }, 0) || 0;
  
  // Use actual maximumVotes for expected attestations, with no default
  const totalExpectedAttestations = slotData?.attestations?.maximumVotes 
    ? Number(slotData.attestations.maximumVotes) 
    : 0;
    
  // Calculate the current phase
  const currentPhase = getCurrentPhase(
    currentTime, 
    nodeBlockSeen, 
    nodeBlockP2P, 
    blockTime,
    attestationsCount,
    totalExpectedAttestations
  );

  // Calculate which relay is active
  const activeRelays = React.useMemo(() => {
    const relaysSet = new Set(bids.filter(bid => bid.time <= currentTime).map(bid => bid.relayName));
    return relaysSet.size;
  }, [bids, currentTime]);

  // Helper function to determine if an entity should be active in current phase
  // Modified to keep entities active once they've been activated
  const isActiveInPhase = (entity: 'builder' | 'relay' | 'proposer' | 'node' | 'attester' | 'accepted') => {
    // REQUIREMENT 1: If we don't have a phase (null), default to showing Building phase
    if (currentPhase === null) {
      // When no phase data is available, show builders and relays as active
      return entity === 'builder' || entity === 'relay';
    }
    
    // Keep each entity active once its phase has been reached or passed
    switch (entity) {
      case 'builder':
        // Builders are always active
        return true;
      case 'relay':
        // Relays are always active
        return true;
      case 'proposer':
        // Proposer active during/after propagation phase
        return currentPhase !== Phase.Building;
      case 'node':
        // Nodes active during/after propagation phase
        return currentPhase !== Phase.Building;
      case 'attester':
        // Attesters active during/after attestation phase
        return currentPhase === Phase.Attesting || currentPhase === Phase.Accepted;
      case 'accepted':
        // Accepted only active during accepted phase
        return currentPhase === Phase.Accepted;
      default:
        return false;
    }
  };

  return (
    <div className="bg-surface/40 rounded-b-xl shadow-lg px-2 pb-4 relative z-10 border-t-0 -mt-1">
      <div className="flex justify-between items-center px-2 relative z-10">
      {/* 1. BUILDERS PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isActiveInPhase('builder') ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-opacity duration-500 ${
            isActiveInPhase('builder')
              ? 'bg-gradient-to-br from-orange-500/60 to-orange-600/30 border-2 border-orange-400/80' // Active
              : currentPhase === Phase.Propagating || currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/10 border-2 border-orange-400/40' // Completed
                : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${isActiveInPhase('builder') ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Robot (Builder)"
          >
            🤖
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${isActiveInPhase('builder') ? 'text-orange-300' : 'text-primary/70'}`}>Builders</div>
        <div className={`text-xs ${isActiveInPhase('builder') ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {bids.length > 0 
            ? `${countUniqueBuilderPubkeys(bids)} builder${countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''}` 
            : 'Waiting...'}
        </div>
      </div>

      {/* Flow line 1 - Builder to Relay: Orange to Green */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-green-400 rounded-full shadow-inner"
          style={{
            opacity: 0.8
          }}
        />
      </div>

      {/* 2. RELAYS PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isActiveInPhase('relay') ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-opacity duration-500 ${
            isActiveInPhase('relay')
              ? 'bg-gradient-to-br from-green-500/60 to-green-600/30 border-2 border-green-400/80' // Active
              : currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-green-500/30 to-green-600/10 border-2 border-green-400/40' // Completed
                : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${isActiveInPhase('relay') ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="MEV Relay"
          >
            🔄
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${isActiveInPhase('relay') ? 'text-green-300' : 'text-primary/70'}`}>Relays</div>
        <div className={`text-xs ${isActiveInPhase('relay') ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {winningBid 
            ? `${winningBid.relayName}` 
            : activeRelays > 0 
              ? `${activeRelays} relay${activeRelays > 1 ? 's' : ''}` 
              : 'Waiting...'}
        </div>
      </div>

      {/* Flow line 2 - Relay to Proposer: Green to Gold */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className="h-1.5 w-full bg-gradient-to-r from-green-400 to-amber-400 rounded-full shadow-inner"
          style={{
            opacity: 0.8
          }}
        />
      </div>

      {/* 3. PROPOSER PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isActiveInPhase('proposer') ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-opacity duration-500 ${
            isActiveInPhase('proposer')
              ? 'bg-gradient-to-br from-amber-500/60 to-amber-600/30 border-2 border-amber-400/80' // Active
              : currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-amber-500/40 to-amber-600/10 border-2 border-amber-400/60' // Completed
                : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${isActiveInPhase('proposer') ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Proposer"
          >
            👤
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${isActiveInPhase('proposer') ? 'text-amber-300' : 'text-primary/70'}`}>Proposer</div>
        <div className={`text-xs ${isActiveInPhase('proposer') ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6 text-center`}>
          {proposer ? `${proposer.proposerValidatorIndex}` : 'Waiting...'}
        </div>
        {currentPhase !== Phase.Building && blockTime !== undefined && (
          <div className="text-xs font-mono text-success absolute -bottom-4 whitespace-nowrap">
            {(blockTime / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {/* Flow line 3 - Proposer to Nodes: Gold to Purple */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-purple-400 rounded-full shadow-inner"
          style={{
            opacity: 0.8
          }}
        />
      </div>

      {/* NODES PHASE - INSERTED BETWEEN PROPOSER AND ATTESTERS */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isActiveInPhase('node') ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-opacity duration-500 ${
            isActiveInPhase('node')
              ? 'bg-gradient-to-br from-purple-500/60 to-purple-600/30 border-2 border-purple-400/80' // Active
              : currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-purple-500/40 to-purple-600/20 border-2 border-purple-400/60' // Completed
                : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${isActiveInPhase('node') ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Network Nodes"
          >
            🖥️
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${isActiveInPhase('node') ? 'text-purple-300' : 'text-primary/70'}`}>Nodes</div>
        <div className={`text-xs ${isActiveInPhase('node') ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {Object.keys(nodes).length > 0 ? `${Object.keys(nodes).length} nodes` : 'Waiting...'}
        </div>
      </div>

      {/* Flow line 4 - Nodes to Attesters: Purple to Blue */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className="h-1.5 w-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full shadow-inner"
          style={{
            opacity: 0.8
          }}
        />
      </div>

      {/* 4. ATTESTATION PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isActiveInPhase('attester') ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-opacity duration-500 ${
            isActiveInPhase('attester')
              ? 'bg-gradient-to-br from-blue-500/60 to-blue-600/30 border-2 border-blue-400/80' // Active
              : currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/10 border-2 border-blue-400/40' // Completed
                : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${isActiveInPhase('attester') ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Attesters"
          >
            ✓
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${isActiveInPhase('attester') ? 'text-blue-300' : 'text-primary/70'}`}>Attesters</div>
        <div className={`text-xs ${isActiveInPhase('attester') ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {(() => {
            // REQUIREMENT 3 & 4: Calculate attestation percentage based on actual data with max from the slot
            let visibleAttestationsCount = 0;
            let totalExpectedAttestations = 0;
            
            // Get the maximum expected attestations from the slot data
            if (slotData?.attestations?.maximumVotes) {
              totalExpectedAttestations = Number(slotData.attestations.maximumVotes);
            }
            
            // Count attestations that have been included up to the current time
            if (slotData?.attestations?.windows && Array.isArray(slotData.attestations.windows)) {
              slotData.attestations.windows.forEach((window: any) => {
                // Use the same method as in the phase calculation above
                if (window.startMs !== undefined && 
                    Number(window.startMs) <= currentTime) {
                  visibleAttestationsCount += (window.validatorIndices?.length || 0);
                }
              });
            }
            
            // Show percentage in attestation or accepted phase
            if ((isActiveInPhase('attester') || isActiveInPhase('accepted')) && 
                totalExpectedAttestations > 0) {
              // Calculate percentage
              const percentage = Math.min(100, Math.round((visibleAttestationsCount / totalExpectedAttestations) * 100));
              return `${percentage}%`;
            }
            
            return 'Waiting...';
          })()}
        </div>
      </div>

      {/* Flow line 5 - Attesters to Accepted: Blue to Green */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className="h-1.5 w-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full shadow-inner"
          style={{
            opacity: 0.8
          }}
        />
      </div>

      {/* 5. ACCEPTED PHASE - NEW */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isActiveInPhase('accepted') ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-opacity duration-500 ${
            isActiveInPhase('accepted')
              ? 'bg-gradient-to-br from-green-500/60 to-green-600/30 border-2 border-green-400/80' // Active
              : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${isActiveInPhase('accepted') ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Accepted"
          >
            🔒
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${isActiveInPhase('accepted') ? 'text-green-300' : 'text-primary/70'}`}>Accepted</div>
        <div className={`text-xs ${isActiveInPhase('accepted') ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {isActiveInPhase('accepted') && slotData?.attestations?.windows
            ? (() => {
                // Calculate when it hit 66% attestations (acceptance time)
                let acceptanceTime = Infinity;
                const totalExpectedAttestations = slotData?.attestations?.maximumVotes 
                  ? Number(slotData.attestations.maximumVotes) 
                  : 0;
                
                if (totalExpectedAttestations > 0) {
                  // Threshold for 66% of attestations
                  const threshold = Math.ceil(totalExpectedAttestations * 0.66);
                  let cumulativeAttestations = 0;
                  
                  // Sort windows by time
                  const sortedWindows = [...(slotData.attestations.windows || [])].sort((a, b) => {
                    return Number(a.startMs || Infinity) - Number(b.startMs || Infinity);
                  });
                  
                  // Find the window when we reach 66%
                  for (const window of sortedWindows) {
                    if (window.startMs !== undefined && window.validatorIndices?.length) {
                      cumulativeAttestations += window.validatorIndices.length;
                      
                      if (cumulativeAttestations >= threshold) {
                        acceptanceTime = Number(window.startMs);
                        break;
                      }
                    }
                  }
                }
                
                // Format the acceptance time
                if (acceptanceTime !== Infinity) {
                  return `${(acceptanceTime / 1000).toFixed(1)}s`;
                }
                
                return "Accepted";
              })()
            : "Waiting..."}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PhaseIcons;