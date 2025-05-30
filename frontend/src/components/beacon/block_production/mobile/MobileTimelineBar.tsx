import React, { useMemo } from 'react';
import { getCurrentPhase } from '../common/PhaseUtils';
import { Phase } from '../common/types';
import useTimeline from '@/contexts/timeline';

interface MobileTimelineBarProps {
  currentTime: number;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  attestationsCount?: number;
  totalExpectedAttestations?: number;
  slotData?: any; // Add slot data for more accurate phase transitions

  // Navigation controls
  slotNumber: number | null;
  headLagSlots: number;
  displaySlotOffset: number;
  goToPreviousSlot: () => void;
  goToNextSlot: () => void;
  resetToCurrentSlot: () => void;
  isNextDisabled: boolean;
}

const MobileTimelineBar: React.FC<MobileTimelineBarProps> = ({
  currentTime,
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  attestationsCount = 0,
  totalExpectedAttestations = 0,
  slotData,
  // Navigation controls
  slotNumber,
  displaySlotOffset,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  isNextDisabled,
}) => {
  // Get timeline state from context
  const { currentTimeMs, displayTimeMs, isPlaying, togglePlayPause } = useTimeline();
  currentTime = currentTimeMs;

  // Track previous time for reset detection
  const [previousTimeMs, setPreviousTimeMs] = React.useState(currentTimeMs);
  const isReset = previousTimeMs > currentTimeMs && previousTimeMs > 11000;

  // Update previous time after checking for resets
  React.useEffect(() => {
    setPreviousTimeMs(currentTimeMs);
  }, [currentTimeMs]);
  // Get the current phase
  const currentPhase = useMemo(() => {
    return getCurrentPhase(
      currentTime,
      nodeBlockSeen,
      nodeBlockP2P,
      blockTime,
      attestationsCount,
      totalExpectedAttestations,
    );
  }, [
    currentTime,
    nodeBlockSeen,
    nodeBlockP2P,
    blockTime,
    attestationsCount,
    totalExpectedAttestations,
  ]);

  // Get more descriptive phase text and colors based on the current phase
  const { phaseText, phaseColors } = useMemo(() => {
    const colors = {
      building: 'bg-orange-500/20 text-orange-300',
      propagating: 'bg-purple-500/20 text-purple-300',
      attesting: 'bg-blue-500/20 text-blue-300',
      accepted: 'bg-green-500/20 text-green-300',
    };

    let text = 'Building';
    let colorClass = colors.building;

    switch (currentPhase) {
      case Phase.Building:
        text = 'Building';
        colorClass = colors.building;
        break;
      case Phase.Propagating:
        text = 'Propagating';
        colorClass = colors.propagating;
        break;
      case Phase.Attesting:
        text = 'Attesting';
        colorClass = colors.attesting;
        break;
      case Phase.Accepted:
        text = 'Accepted';
        colorClass = colors.accepted;
        break;
      default:
        text = 'Building';
        colorClass = colors.building;
    }

    return { phaseText: text, phaseColors: colorClass };
  }, [currentPhase]);

  // Calculate phase transition times dynamically from real data when available
  const { transitionTimes, phaseWidths } = useMemo(() => {
    // Get slot duration from data or use a reasonable guess based on the network
    const slotDuration = slotData?.network?.config?.SECONDS_PER_SLOT
      ? slotData.network.config.SECONDS_PER_SLOT * 1000
      : 12000; // If not available in data, most networks use 12s

    // Find the actual phase transition times from the data
    let propagationTime: number | null = null; // When any node first sees the block
    let attestationTime: number | null = null; // When first attestation is received
    let acceptanceTime: number | null = null; // When 66% attestations are received

    // --- Find propagation transition time (when block first propagates) ---

    // Try to find earliest node timing from available data
    let earliestNodeTime = Infinity;

    // Check API timings
    Object.values(nodeBlockSeen).forEach(time => {
      if (typeof time === 'number') {
        earliestNodeTime = Math.min(earliestNodeTime, time);
      }
    });

    // Check P2P timings
    Object.values(nodeBlockP2P).forEach(time => {
      if (typeof time === 'number') {
        earliestNodeTime = Math.min(earliestNodeTime, time);
      }
    });

    // Only use real data, no fallbacks
    if (earliestNodeTime !== Infinity) {
      propagationTime = earliestNodeTime;
    } else if (blockTime !== undefined) {
      propagationTime = blockTime;
    } else {
      // No fallback - if no block data, use the current time
      propagationTime = currentTime;
    }

    // --- Find attestation transition time ---

    // Look for first attestation in the data if available
    if (
      slotData &&
      slotData.attestations &&
      slotData.attestations.windows &&
      Array.isArray(slotData.attestations.windows)
    ) {
      // Sort windows by time to find the earliest attestation
      const sortedWindows = [...slotData.attestations.windows].sort((a, b) => {
        return Number(a.startMs || Infinity) - Number(b.startMs || Infinity);
      });

      // Find first window with attestations
      for (const window of sortedWindows) {
        if (
          window.startMs !== undefined &&
          window.validatorIndices?.length &&
          window.validatorIndices.length > 0
        ) {
          attestationTime = Number(window.startMs);
          break;
        }
      }
    }

    // No fallbacks - only use real data
    if (attestationTime === null) {
      // If no attestation data, use current time
      attestationTime = currentTime;
    }

    // --- Find acceptance transition time (66% attestations) ---

    // Check for 66% attestation threshold in data
    if (
      slotData &&
      slotData.attestations &&
      slotData.attestations.windows &&
      Array.isArray(slotData.attestations.windows) &&
      totalExpectedAttestations > 0
    ) {
      const threshold = Math.ceil(totalExpectedAttestations * 0.66);
      let cumulativeAttestations = 0;

      // Sort windows by time
      const sortedWindows = [...slotData.attestations.windows].sort((a, b) => {
        return Number(a.startMs || Infinity) - Number(b.startMs || Infinity);
      });

      // Find when attestations reach 66%
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

    // No fallbacks - only use real data
    if (acceptanceTime === null) {
      // If no acceptance data, use current time
      acceptanceTime = currentTime;
    }

    // Ensure transitions are in proper order (but don't force specific times)
    // Just make sure they happen in sequence if we have real data
    if (propagationTime !== null && attestationTime !== null && propagationTime > attestationTime) {
      attestationTime = propagationTime;
    }

    if (attestationTime !== null && acceptanceTime !== null && attestationTime > acceptanceTime) {
      acceptanceTime = attestationTime;
    }

    // Ensure values are within the slot (0 to slotDuration)
    if (propagationTime !== null) {
      propagationTime = Math.max(0, Math.min(propagationTime, slotDuration));
    }

    if (attestationTime !== null) {
      attestationTime = Math.max(0, Math.min(attestationTime, slotDuration));
    }

    if (acceptanceTime !== null) {
      acceptanceTime = Math.max(0, Math.min(acceptanceTime, slotDuration));
    }

    // Calculate the percentages for each phase
    const propagationPercent = (propagationTime / slotDuration) * 100;
    const attestationPercent = (attestationTime / slotDuration) * 100;
    const acceptancePercent = (acceptanceTime / slotDuration) * 100;

    // Calculate widths for each phase section
    const buildingWidth = propagationPercent;
    const propagatingWidth = attestationPercent - propagationPercent;
    const attestingWidth = acceptancePercent - attestationPercent;
    const acceptedWidth = 100 - acceptancePercent;

    return {
      transitionTimes: {
        propagation: propagationTime,
        attestation: attestationTime,
        acceptance: acceptanceTime,
      },
      phaseWidths: {
        building: buildingWidth,
        propagating: propagatingWidth,
        attesting: attestingWidth,
        accepted: acceptedWidth,
      },
    };
  }, [nodeBlockSeen, nodeBlockP2P, blockTime, slotData, totalExpectedAttestations, currentTime]);

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
            <svg
              className="h-3 w-3 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            onClick={resetToCurrentSlot}
            className={`px-1.5 py-0.5 rounded border font-medium text-xs ${
              displaySlotOffset === 0
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
            className={`bg-surface p-1 rounded border border-subtle transition ${
              isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
            }`}
            disabled={isNextDisabled}
            title="Next Slot"
          >
            <svg
              className="h-3 w-3 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Slot number centered */}
        <div className="font-mono text-xs text-primary">Slot: {slotNumber ?? '—'}</div>

        {/* Play/Pause on the right */}
        <button
          onClick={togglePlayPause}
          className="bg-surface p-1 rounded border border-subtle hover:bg-hover transition"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg
              className="h-3 w-3 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg
              className="h-3 w-3 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
      </div>

      {/* Phase and time info - Updated with more detailed phase information */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center text-xs">
          <span className="mr-1">Phase:</span>
          <span className={`font-medium px-1.5 py-0.5 rounded-full ${phaseColors}`}>
            {phaseText}
          </span>
        </div>
        <div className="font-mono text-xs text-white">{(displayTimeMs / 1000).toFixed(1)}s</div>
      </div>

      {/* Phase indicators - Mini icons for all phases */}
      <div className="flex justify-between items-center mb-2 px-1">
        {/* Building phase icon - Always shows as active during building, completed after */}
        <div
          className={`flex flex-col items-center transition-opacity duration-300 ${
            currentTime < transitionTimes.propagation ? 'opacity-100' : 'opacity-80'
          }`}
        >
          <div
            className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 
            ${
              currentPhase === Phase.Building
                ? 'bg-gradient-to-br from-orange-500/70 to-orange-600/40 border-2 border-orange-400/80 shadow-orange-500/30 shadow-sm'
                : 'bg-gradient-to-br from-orange-500/30 to-orange-600/10 border-2 border-orange-400/40'
            }`}
          >
            <span className="text-xs">🤖</span>
          </div>
          <span
            className={`text-[8px] ${currentPhase === Phase.Building ? 'text-orange-300' : 'text-primary/50'}`}
          >
            Building
          </span>
        </div>

        {/* Relaying phase icon - Active during propagating, dimmed otherwise */}
        <div
          className={`flex flex-col items-center transition-opacity duration-300 ${
            currentTime >= transitionTimes.propagation ? 'opacity-100' : 'opacity-60'
          }`}
        >
          <div
            className={`w-6 h-6 flex items-center justify-center rounded-full mb-1
            ${
              currentPhase === Phase.Propagating
                ? 'bg-gradient-to-br from-purple-500/70 to-purple-600/40 border-2 border-purple-400/80 shadow-purple-500/30 shadow-sm'
                : currentPhase !== null && currentPhase > Phase.Propagating
                  ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/10 border-2 border-purple-400/40'
                  : 'bg-surface/50 border border-border/40'
            }`}
          >
            <span className="text-xs">🔄</span>
          </div>
          <span
            className={`text-[8px] ${currentPhase === Phase.Propagating ? 'text-purple-300' : 'text-primary/50'}`}
          >
            Relaying
          </span>
        </div>

        {/* Attesting phase icon - Active during attesting, dimmed before, completed after */}
        <div
          className={`flex flex-col items-center transition-opacity duration-300 ${
            currentTime >= transitionTimes.attestation ? 'opacity-100' : 'opacity-60'
          }`}
        >
          <div
            className={`w-6 h-6 flex items-center justify-center rounded-full mb-1
            ${
              currentPhase === Phase.Attesting
                ? 'bg-gradient-to-br from-blue-500/70 to-blue-600/40 border-2 border-blue-400/80 shadow-blue-500/30 shadow-sm'
                : currentPhase !== null && currentPhase > Phase.Attesting
                  ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/10 border-2 border-blue-400/40'
                  : 'bg-surface/50 border border-border/40'
            }`}
          >
            <span className="text-xs">✓</span>
          </div>
          <span
            className={`text-[8px] ${currentPhase === Phase.Attesting ? 'text-blue-300' : 'text-primary/50'}`}
          >
            Attesting
          </span>
        </div>

        {/* Accepted phase icon - Only active during acceptance phase */}
        <div
          className={`flex flex-col items-center transition-opacity duration-300 ${
            currentTime >= transitionTimes.acceptance ? 'opacity-100' : 'opacity-60'
          }`}
        >
          <div
            className={`w-6 h-6 flex items-center justify-center rounded-full mb-1
            ${
              currentPhase === Phase.Accepted
                ? 'bg-gradient-to-br from-green-500/70 to-green-600/40 border-2 border-green-400/80 shadow-green-500/30 shadow-sm'
                : 'bg-surface/50 border border-border/40'
            }`}
          >
            <span className="text-xs">🔒</span>
          </div>
          <span
            className={`text-[8px] ${currentPhase === Phase.Accepted ? 'text-green-300' : 'text-primary/50'}`}
          >
            Accepted
          </span>
        </div>
      </div>

      {/* Enhanced progress bar with all phases */}
      <div className="relative pt-2 pb-4">
        <div className="h-2 mb-2 flex rounded-lg overflow-hidden border border-subtle relative">
          {/* Building phase */}
          <div
            className="border-r border-white/5 transition-colors duration-300"
            style={{
              width: `${phaseWidths.building}%`,
              backgroundColor:
                currentPhase === Phase.Building
                  ? 'rgba(249, 115, 22, 0.3)' // Active
                  : 'rgba(249, 115, 22, 0.1)', // Inactive
            }}
          />

          {/* Propagating phase */}
          <div
            className="border-r border-white/5 transition-colors duration-300"
            style={{
              width: `${phaseWidths.propagating}%`,
              backgroundColor:
                currentPhase === Phase.Propagating
                  ? 'rgba(168, 85, 247, 0.3)' // Active
                  : 'rgba(168, 85, 247, 0.1)', // Inactive
            }}
          />

          {/* Attesting phase */}
          <div
            className="border-r border-white/5 transition-colors duration-300"
            style={{
              width: `${phaseWidths.attesting}%`,
              backgroundColor:
                currentPhase === Phase.Attesting
                  ? 'rgba(59, 130, 246, 0.3)' // Active
                  : 'rgba(59, 130, 246, 0.1)', // Inactive
            }}
          />

          {/* Accepted phase */}
          <div
            className="transition-colors duration-300"
            style={{
              width: `${phaseWidths.accepted}%`,
              backgroundColor:
                currentPhase === Phase.Accepted
                  ? 'rgba(34, 197, 94, 0.3)' // Active
                  : 'rgba(34, 197, 94, 0.1)', // Inactive
            }}
          />

          {/* Phase transition markers */}
          <div
            className="absolute top-0 bottom-0 w-[2px] transition-colors duration-300"
            style={{
              left: `${phaseWidths.building}%`,
              backgroundColor:
                currentPhase !== null && currentPhase >= Phase.Propagating
                  ? 'rgba(255, 255, 255, 0.6)' // Passed
                  : 'rgba(255, 255, 255, 0.2)', // Not yet
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-[2px] transition-colors duration-300"
            style={{
              left: `${phaseWidths.building + phaseWidths.propagating}%`,
              backgroundColor:
                currentPhase !== null && currentPhase >= Phase.Attesting
                  ? 'rgba(255, 255, 255, 0.6)' // Passed
                  : 'rgba(255, 255, 255, 0.2)', // Not yet
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-[2px] transition-colors duration-300"
            style={{
              left: `${phaseWidths.building + phaseWidths.propagating + phaseWidths.attesting}%`,
              backgroundColor:
                currentPhase !== null && currentPhase >= Phase.Accepted
                  ? 'rgba(255, 255, 255, 0.6)' // Passed
                  : 'rgba(255, 255, 255, 0.2)', // Not yet
            }}
          />
        </div>

        {/* Time indicator tick */}
        <div
          className="absolute top-2 h-2 bg-white"
          style={{
            width: '2px',
            left: `${(currentTime / (slotData?.network?.config?.SECONDS_PER_SLOT ? slotData.network.config.SECONDS_PER_SLOT * 1000 : 12000)) * 100}%`,
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
            transition: isReset ? 'none' : 'left 50ms linear',
          }}
        />

        {/* Time markers - dynamic based on slot duration */}
        <div className="flex justify-between text-[9px] font-mono text-tertiary/60 px-1">
          <span>0s</span>
          {slotData?.network?.config?.SECONDS_PER_SLOT ? (
            <>
              <span>{Math.floor(slotData.network.config.SECONDS_PER_SLOT / 3)}s</span>
              <span>{Math.floor((slotData.network.config.SECONDS_PER_SLOT / 3) * 2)}s</span>
              <span>{slotData.network.config.SECONDS_PER_SLOT}s</span>
            </>
          ) : (
            <>
              <span>4s</span>
              <span>8s</span>
              <span>12s</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTimelineBar;
