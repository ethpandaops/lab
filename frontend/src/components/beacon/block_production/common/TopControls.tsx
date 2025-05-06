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
    <div className="flex items-center justify-between py-2 px-4 bg-surface/30 rounded-t-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={goToPreviousSlot}
          className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
          title="Previous Slot"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-primary" />
        </button>

        <button
          onClick={resetToCurrentSlot}
          className={`px-2 py-1 rounded border font-medium text-xs ${
            displaySlotOffset === 0
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
          className={`bg-surface/50 p-1.5 rounded border border-subtle transition ${
            isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
          }`}
          disabled={isNextDisabled}
          title="Next Slot"
        >
          <ChevronRight className="h-3.5 w-3.5 text-primary" />
        </button>

        <div
          className={`font-mono ml-1 text-primary flex flex-col ${isMobile ? 'text-xs' : 'text-sm'}`}
        >
          <div>Slot: {slotNumber ?? '—'}</div>
          {slotNumber !== null && displaySlotOffset !== 0 && (
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-secondary opacity-70`}>
              Lag: {headLagSlots - displaySlotOffset}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={togglePlayPause}
        className="bg-surface/50 p-1.5 rounded border border-subtle hover:bg-hover transition"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Play className="h-3.5 w-3.5 text-primary" />
        )}
      </button>
    </div>
  );
};

export default TopControls;
