import React from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface TopControlsProps {
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

const TopControls: React.FC<TopControlsProps> = ({
  slotNumber,
  headLagSlots,
  displaySlotOffset,
  isPlaying,
  isMobile,
  goToPreviousSlot,
  goToNextSlot,
  resetToCurrentSlot,
  togglePlayPause,
  isNextDisabled,
}) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-surface border-b border-subtle shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-surface/70 p-0.5 rounded-lg border border-subtle">
          <button
            onClick={goToPreviousSlot}
            className="p-1.5 rounded-md transition focus:outline-none focus:ring-1 focus:ring-accent/70 hover:bg-hover"
            title="Previous Slot"
          >
            <ChevronLeft className="h-4 w-4 text-primary" />
          </button>

          <button
            onClick={resetToCurrentSlot}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition focus:outline-none focus:ring-1 focus:ring-accent/70 ${
              displaySlotOffset === 0 ? 'bg-accent/20 text-accent' : 'text-secondary hover:bg-hover'
            }`}
            disabled={displaySlotOffset === 0}
            title="Return to Current Slot"
          >
            Live
          </button>

          <button
            onClick={goToNextSlot}
            className={`p-1.5 rounded-md transition focus:outline-none focus:ring-1 focus:ring-accent/70 ${
              isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
            }`}
            disabled={isNextDisabled}
            title="Next Slot"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>
        </div>

        <div className={`font-mono text-primary flex flex-col ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <div className="font-semibold text-base">Slot: {slotNumber ?? '—'}</div>
          {slotNumber !== null && displaySlotOffset !== 0 && (
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-secondary opacity-80`}>
              Lag: {headLagSlots - displaySlotOffset}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={togglePlayPause}
        className="bg-surface/70 p-1.5 rounded-md border border-subtle hover:bg-hover transition focus:outline-none focus:ring-1 focus:ring-accent/70"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-primary" />
        ) : (
          <Play className="h-4 w-4 text-primary" />
        )}
      </button>
    </div>
  );
};

export default TopControls;
