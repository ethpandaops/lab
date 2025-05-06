import React from 'react';

interface SlotTimerProps {
  currentTime: number; // Time in milliseconds (0-12000)
}

export const SlotTimer: React.FC<SlotTimerProps> = ({ currentTime }) => {
  // Ensure currentTime is within the expected range [0, 12000]
  const clampedTime = Math.max(0, Math.min(currentTime, 12000));
  const seconds = (clampedTime / 1000).toFixed(1);

  return (
    <div className="text-sm text-secondary font-mono">
      Slot Timer: {seconds}s / 12.0s
    </div>
  );
};