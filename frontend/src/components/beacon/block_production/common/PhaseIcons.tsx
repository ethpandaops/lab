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
  // Get attestation data for phase calculation
  const attestationsCount = slotData?.attestations?.windows.reduce((total: number, window: any) => {
    if (window.inclusionDelay !== undefined && (window.inclusionDelay * 1000) <= currentTime) {
      return total + (window.validatorIndices?.length || 0);
    }
    return total;
  }, 0) || 0;
  
  const totalExpectedAttestations = slotData?.attestations?.maximumVotes 
    ? Number(slotData.attestations.maximumVotes) 
    : 128;
    
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

  return (
    <div className="flex justify-between items-center px-2 mt-4 relative z-10">
      {/* 1. BUILDERS PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${currentPhase !== Phase.Building ? 'opacity-60' : 'opacity-100'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-all duration-500 ${
            currentPhase === Phase.Building
              ? 'bg-gradient-to-br from-orange-500/60 to-orange-600/30 border-2 border-orange-400/80 scale-105' // Active
              : currentPhase === Phase.Propagating || currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/10 border-2 border-orange-400/40' // Completed
                : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${currentPhase === Phase.Building ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Robot (Builder)"
          >
            🤖
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${currentPhase === Phase.Building ? 'text-orange-300' : 'text-primary/70'}`}>Builders</div>
        <div className={`text-xs ${currentPhase === Phase.Building ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {bids.length > 0 
            ? `${countUniqueBuilderPubkeys(bids)} builder${countUniqueBuilderPubkeys(bids) > 1 ? 's' : ''}` 
            : 'Waiting...'}
        </div>
      </div>

      {/* Flow line 1 */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className={`h-1 w-full ${
            currentPhase !== Phase.Building
              ? 'bg-gradient-to-r from-orange-400/80 to-green-400/80' 
              : 'bg-gradient-to-r from-orange-400/30 to-green-400/30'
          } transition-colors duration-500 rounded-full overflow-hidden`}
        >
          {currentPhase !== Phase.Building && (
            <div 
              className={`h-full w-2 bg-white opacity-70 rounded-full`}
              style={{
                animation: 'pulseOpacity 1.5s infinite ease-in-out',
                boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.5)'
              }}
            ></div>
          )}
        </div>
      </div>

      {/* 2. RELAYS PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${currentPhase !== Phase.Building && currentPhase !== Phase.Propagating ? 'opacity-60' : 'opacity-100'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-all duration-500 ${
            currentPhase === Phase.Building
              ? 'bg-surface/30 border border-subtle/60' // Not yet active
              : currentPhase === Phase.Propagating
                ? 'bg-gradient-to-br from-green-500/60 to-green-600/30 border-2 border-green-400/80 scale-105' // Active
                : 'bg-gradient-to-br from-green-500/30 to-green-600/10 border-2 border-green-400/40' // Completed
          }`}
        >
          <div 
            className={`text-2xl ${currentPhase === Phase.Propagating ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="MEV Relay"
          >
            🔄
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${currentPhase === Phase.Propagating ? 'text-green-300' : 'text-primary/70'}`}>Relays</div>
        <div className={`text-xs ${currentPhase === Phase.Propagating ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {winningBid 
            ? `${winningBid.relayName}` 
            : activeRelays > 0 
              ? `${activeRelays} relay${activeRelays > 1 ? 's' : ''}` 
              : 'Waiting...'}
        </div>
      </div>

      {/* Flow line 2 */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className={`h-1 w-full ${
            currentPhase !== Phase.Building && currentPhase !== Phase.Propagating
              ? 'bg-gradient-to-r from-green-400/80 to-gold/80' 
              : 'bg-gradient-to-r from-green-400/30 to-gold/30'
          } transition-colors duration-500 rounded-full overflow-hidden`}
        >
          {currentPhase !== Phase.Building && currentPhase !== Phase.Propagating && (
            <div 
              className="h-full w-2 bg-white opacity-70 rounded-full"
              style={{
                animation: 'pulseOpacity 1.5s infinite ease-in-out',
                boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.5)'
              }}
            ></div>
          )}
        </div>
      </div>

      {/* 3. PROPOSER PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${
        currentPhase === Phase.Building || currentPhase === Phase.Propagating 
          ? 'opacity-60' 
          : currentPhase === Phase.Attesting 
            ? 'opacity-100' 
            : 'opacity-80'
      }`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-all duration-500 ${
            currentPhase === Phase.Building || currentPhase === Phase.Propagating
              ? 'bg-surface/30 border border-subtle/60' // Not yet active
              : currentPhase === Phase.Attesting
                ? 'bg-gradient-to-br from-gold/60 to-amber-600/30 border-2 border-gold/80 scale-105' // Active
                : 'bg-gradient-to-br from-gold/40 to-amber-600/10 border-2 border-gold/60' // Completed
          }`}
        >
          <div 
            className={`text-2xl ${currentPhase === Phase.Attesting ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Proposer"
          >
            👤
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${currentPhase === Phase.Attesting ? 'text-amber-300' : 'text-primary/70'}`}>Proposer</div>
        <div className={`text-xs ${currentPhase === Phase.Attesting ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6 text-center`}>
          {proposer ? `${proposer.proposerValidatorIndex}` : 'Waiting...'}
        </div>
        {currentPhase !== Phase.Building && blockTime !== undefined && (
          <div className="text-xs font-mono text-success absolute -bottom-4 whitespace-nowrap">
            {(blockTime / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {/* Flow line 3 */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className={`h-1 w-full ${
            currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
              ? 'bg-gradient-to-r from-gold/80 to-purple-400/80' 
              : 'bg-gradient-to-r from-gold/30 to-purple-400/30'
          } transition-colors duration-500 rounded-full overflow-hidden`}
        >
          {(currentPhase === Phase.Attesting || currentPhase === Phase.Accepted) && (
            <div 
              className="h-full w-2 bg-white opacity-70 rounded-full"
              style={{
                animation: 'pulseOpacity 1.5s infinite ease-in-out',
                boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.5)'
              }}
            ></div>
          )}
        </div>
      </div>

      {/* NODES PHASE - INSERTED BETWEEN PROPOSER AND ATTESTERS */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${
        currentPhase === Phase.Building || currentPhase === Phase.Propagating 
          ? 'opacity-60' 
          : currentPhase === Phase.Attesting 
            ? 'opacity-100' 
            : 'opacity-80'
      }`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-all duration-500 ${
            currentPhase === Phase.Building || currentPhase === Phase.Propagating
              ? 'bg-surface/30 border border-subtle/60' // Not yet active
              : currentPhase === Phase.Attesting
                ? 'bg-gradient-to-br from-purple-500/60 to-purple-600/30 border-2 border-purple-400/80 scale-105' // Active
                : 'bg-gradient-to-br from-purple-500/40 to-purple-600/20 border-2 border-purple-400/60' // Completed
          }`}
        >
          <div 
            className={`text-2xl ${currentPhase === Phase.Attesting ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Network Nodes"
          >
            🖥️
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${currentPhase === Phase.Attesting ? 'text-purple-300' : 'text-primary/70'}`}>Nodes</div>
        <div className={`text-xs ${currentPhase === Phase.Attesting ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {Object.keys(nodes).length > 0 ? `${Object.keys(nodes).length} nodes` : 'Waiting...'}
        </div>
      </div>

      {/* Flow line between Nodes and Attesters */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className={`h-1 w-full ${
            currentPhase === Phase.Attesting || currentPhase === Phase.Accepted
              ? 'bg-gradient-to-r from-purple-400/80 to-blue-400/80' 
              : 'bg-gradient-to-r from-purple-400/30 to-blue-400/30'
          } transition-colors duration-500 rounded-full overflow-hidden`}
        >
          {(currentPhase === Phase.Attesting || currentPhase === Phase.Accepted) && (
            <div 
              className="h-full w-2 bg-white opacity-70 rounded-full"
              style={{
                animation: 'pulseOpacity 1.5s infinite ease-in-out',
                boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.5)'
              }}
            ></div>
          )}
        </div>
      </div>

      {/* 4. ATTESTATION PHASE */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${
        currentPhase === Phase.Attesting
          ? 'opacity-100'
          : currentPhase === Phase.Accepted
            ? 'opacity-80'
            : 'opacity-60'
      }`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-all duration-500 ${
            currentPhase === Phase.Building || currentPhase === Phase.Propagating
              ? 'bg-surface/30 border border-subtle/60' // Not yet active
              : currentPhase === Phase.Attesting
                ? 'bg-gradient-to-br from-blue-500/60 to-blue-600/30 border-2 border-blue-400/80 scale-105' // Active
                : 'bg-gradient-to-br from-blue-500/30 to-blue-600/10 border-2 border-blue-400/40' // Completed
          }`}
        >
          <div 
            className={`text-2xl ${currentPhase === Phase.Attesting || currentPhase === Phase.Accepted ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Attesters"
          >
            ✓
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${currentPhase === Phase.Attesting ? 'text-blue-300' : 'text-primary/70'}`}>Attesters</div>
        <div className={`text-xs ${currentPhase === Phase.Attesting ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {(() => {
            // Get attestation count from data, filtering by current time
            let count = 0;
            let total = 128; // Default total
            
            if (slotData?.attestations) {
              // Method 1: Using windowed attestations data, filtered by current time
              if (Array.isArray(slotData.attestations.windows)) {
                // Only include windows that have occurred at or before the current time
                const filteredWindows = slotData.attestations.windows.filter((window: any) => {
                  return window.inclusionDelay !== undefined && 
                    (window.inclusionDelay * 1000) <= currentTime;
                });
                
                // Count attestations from filtered windows
                count = filteredWindows.reduce((sum: number, window: any) => {
                  return sum + (Array.isArray(window.validatorIndices) ? window.validatorIndices.length : 0);
                }, 0);
              }
              
              // Use maximum votes as total if available
              if (slotData.attestations.maximumVotes) {
                total = Number(slotData.attestations.maximumVotes);
              }
            }
            
            // Show actual percentage of attestations received regardless of phase
            if (currentPhase === Phase.Attesting || currentPhase === Phase.Accepted) {
              // Always calculate attestation percentage based on actual data at the current time
              if (total > 0) {
                // Calculate percentage based on attestation count, ensuring we don't exceed 100%
                const percentage = Math.min(100, Math.round((count / total) * 100));
                return `${percentage}%`;
              } else {
                return '0%';
              }
            }
            
            return 'Waiting...';
          })()}
        </div>
      </div>

      {/* Flow line 4 */}
      <div className="flex-shrink-0 flex items-center justify-center relative w-10">
        <div 
          className={`h-1 w-full ${
            currentPhase === Phase.Accepted
              ? 'bg-gradient-to-r from-blue-400/80 to-green-400/80' 
              : 'bg-gradient-to-r from-blue-400/30 to-green-400/30'
          } transition-colors duration-500 rounded-full overflow-hidden`}
        >
          {currentPhase === Phase.Accepted && (
            <div 
              className="h-full w-2 bg-white opacity-70 rounded-full"
              style={{
                animation: 'pulseOpacity 1.5s infinite ease-in-out',
                boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.5)'
              }}
            ></div>
          )}
        </div>
      </div>

      {/* 5. ACCEPTED PHASE - NEW */}
      <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${currentPhase === Phase.Accepted ? 'opacity-100' : 'opacity-60'}`}>
        <div 
          className={`w-14 h-14 flex items-center justify-center rounded-full mb-1.5 shadow-lg transition-all duration-500 ${
            currentPhase === Phase.Accepted
              ? 'bg-gradient-to-br from-green-500/60 to-green-600/30 border-2 border-green-400/80 scale-105' // Active
              : 'bg-surface/30 border border-subtle/60' // Not yet active
          }`}
        >
          <div 
            className={`text-2xl ${currentPhase === Phase.Accepted ? 'opacity-90' : 'opacity-50'}`} 
            role="img" 
            aria-label="Accepted"
          >
            🔒
          </div>
        </div>
        <div className={`font-medium text-sm mb-0.5 ${currentPhase === Phase.Accepted ? 'text-green-300' : 'text-primary/70'}`}>Accepted</div>
        <div className={`text-xs ${currentPhase === Phase.Accepted ? 'text-white/90' : 'text-tertiary'} max-w-[85px] h-6`}>
          {currentPhase === Phase.Accepted
            ? "Finalized"
            : "Waiting..."}
        </div>
      </div>
    </div>
  );
};

export default PhaseIcons;