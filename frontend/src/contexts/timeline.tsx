import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import useBeacon from './beacon';
import { SECONDS_PER_SLOT } from './beacon';

interface TimelineContextValue {
  // Current slot-relative time in milliseconds (0-12000), updated every 250ms for animation
  currentTimeMs: number;

  // Display time updated more frequently (every 100ms) for time display
  displayTimeMs: number;

  // Current slot being displayed
  currentSlot: number | null;

  // Whether the timeline is playing
  isPlaying: boolean;

  // Controls for the timeline
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;

  // Get current time for components that need to animate independently
  getCurrentTimeMs: () => number;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

interface TimelineProviderProps {
  network: string;
  children: React.ReactNode;
  slotOffset?: number; // Optional offset from current slot
}

export const TimelineProvider: React.FC<TimelineProviderProps> = ({ 
  network, 
  children,
  slotOffset = 0,
}) => {
  const { getBeaconClock } = useBeacon();
  const clock = getBeaconClock(network);
  
  // Store current time in a ref to avoid re-renders
  const timeRef = useRef<number>(0);
  
  // Store playing state in state for components that need to show it
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  
  // Store current slot for components that need it
  const [currentSlot, setCurrentSlot] = useState<number | null>(
    clock ? clock.getCurrentSlot() + slotOffset : null
  );
  
  // For components that need current time in state
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);

  // Separate state for time display that updates more frequently (100ms)
  const [displayTimeMs, setDisplayTimeMs] = useState<number>(0);

  // Last update timestamp for manual time simulation
  const lastUpdateRef = useRef<number>(Date.now());
  // Manual counter for time simulation (for precise 20ms updates)
  const simulatedTimeRef = useRef<number>(0);

  // Track last state update (to throttle React state updates)
  const lastStateUpdateRef = useRef<number>(Date.now());

  // Track last time display update (100ms updates)
  const lastTimeDisplayUpdateRef = useRef<number>(Date.now());

  // Track last log time (to avoid console spam)
  const lastLogTimeRef = useRef<number>(Date.now());
  
  // Timeline control functions
  const play = useCallback(() => {
    setIsPlaying(true);
    // Reset last update timestamp when resuming playback
    lastUpdateRef.current = Date.now();
  }, []);
  
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);
  
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev) {
        // If resuming, reset last update timestamp
        lastUpdateRef.current = Date.now();
      }
      return !prev;
    });
  }, []);
  
  // Function to get current time - can be called directly without re-renders
  const getCurrentTimeMs = useCallback(() => {
    return timeRef.current;
  }, []);
  
  // Fast interval for updating time at 20ms intervals
  useEffect(() => {
    if (!clock) return;
    
    // Initialize simulated time based on current slot progress
    if (simulatedTimeRef.current === 0) {
      const slotProgress = clock.getCurrentSlotProgress();
      simulatedTimeRef.current = Math.floor(slotProgress * 1000 * SECONDS_PER_SLOT);
    }
    
    const updateTime = () => {
      if (isPlaying) {
        const now = Date.now();
        const elapsedMs = now - lastUpdateRef.current;
        lastUpdateRef.current = now;
        
        // When in "live" mode with no display offset, calculate our own high-precision progress
        if (slotOffset === 0) {
          // Get the current slot
          const currentSlot = clock.getCurrentSlot();

          // Calculate slot start time in seconds
          const slotStartSec = clock.getSlotStartTime(currentSlot);

          // Calculate current time in milliseconds with full precision
          const nowMs = Date.now();
          const nowSec = nowMs / 1000; // Don't floor this to keep ms precision

          // Calculate progress with millisecond precision
          const progressSec = nowSec - slotStartSec;
          const progressPercent = Math.min(1, Math.max(0, progressSec / SECONDS_PER_SLOT));

          // Convert to milliseconds (0-12000) with full precision
          const currentTime = progressPercent * SECONDS_PER_SLOT * 1000;

          // Always update the ref with current time (for components that access time directly)
          timeRef.current = currentTime;

          const now = Date.now();

          // Update display time on a frequent basis (every 10ms) for smooth time counter updates
          // But don't cause a re-render if the value hasn't meaningfully changed
          // Round to nearest 10ms to avoid unnecessary updates
          const roundedDisplayTime = Math.round(currentTime / 10) * 10;
          if (Math.abs(roundedDisplayTime - displayTimeMs) >= 10) {
            setDisplayTimeMs(roundedDisplayTime);
          }

          // Only update main React state (and cause re-renders) every 50ms
          if (now - lastStateUpdateRef.current >= 50) {
            setCurrentTimeMs(currentTime);
            lastStateUpdateRef.current = now;
          }

          // Update simulated time for when returning from offset mode
          simulatedTimeRef.current = currentTime;
        } else {
          // When in offset mode, simulate time passing at exact 10ms steps
          // But we want to ensure it still progresses smoothly
          simulatedTimeRef.current += Math.min(elapsedMs, 12); // A bit faster than real-time to make up for throttling

          // Loop back to 0 if we reach 12 seconds
          if (simulatedTimeRef.current >= 12000) {
            simulatedTimeRef.current = 0;

            // Also advanced to next slot if we reach the end
            if (currentSlot !== null) {
              // Immediately update all time states to avoid transition animation on reset
              setCurrentTimeMs(0);
              setDisplayTimeMs(0);
              lastStateUpdateRef.current = now;
              lastTimeDisplayUpdateRef.current = now;

              setCurrentSlot(currentSlot + 1);
            }
          }

          // Always update the ref with simulated time (for components that access time directly)
          timeRef.current = simulatedTimeRef.current;

          const now = Date.now();

          // Update display time on a frequent basis (every 10ms) for smooth time counter updates
          // But don't cause a re-render if the value hasn't meaningfully changed
          // Round to nearest 10ms to avoid unnecessary updates
          const roundedDisplayTime = Math.round(simulatedTimeRef.current / 10) * 10;
          if (Math.abs(roundedDisplayTime - displayTimeMs) >= 10) {
            setDisplayTimeMs(roundedDisplayTime);
          }

          // Only update main React state (and cause re-renders) every 50ms
          if (now - lastStateUpdateRef.current >= 50) {
            setCurrentTimeMs(simulatedTimeRef.current);
            lastStateUpdateRef.current = now;
          }
        }
        
        // Update current slot if it's changed (only in live mode)
        if (slotOffset === 0) {
          const newSlot = clock.getCurrentSlot() + slotOffset;
          if (newSlot !== currentSlot) {
            setCurrentSlot(newSlot);
            
            // Reset simulated time when slot changes
            simulatedTimeRef.current = 0;

            // Immediately update all time states to avoid transition animation on reset
            setCurrentTimeMs(0);
            setDisplayTimeMs(0);
            lastStateUpdateRef.current = now;
            lastTimeDisplayUpdateRef.current = now;

            console.log('🔄 Slot changed to', newSlot, '- resetting timeline to 0');
          }
        }
      }
    };
    
    // We use the lastLogTimeRef defined at the component level

    // Update time every 10ms for super-smooth animation
    const intervalId = setInterval(() => {
      const now = Date.now();

      // Update last log time
      lastLogTimeRef.current = now;

      updateTime();
    }, 10); // Much more frequent updates for smoother animation
    
    // Initial update
    updateTime();
    
    // Clean up interval
    return () => {
      clearInterval(intervalId);
    };
  }, [clock, isPlaying, currentSlot, slotOffset]);
  
  // Update slot offset when it changes externally
  useEffect(() => {
    if (!clock) return;
    setCurrentSlot(clock.getCurrentSlot() + slotOffset);
    
    // Reset simulated time when changing to a different slot
    if (slotOffset !== 0) {
      simulatedTimeRef.current = 0;
      timeRef.current = 0;
      setCurrentTimeMs(0);
    } else {
      // When returning to live mode, calculate our own high-precision progress
      const currentSlot = clock.getCurrentSlot();
      const slotStartSec = clock.getSlotStartTime(currentSlot);
      const nowMs = Date.now();
      const nowSec = nowMs / 1000;
      const progressSec = nowSec - slotStartSec;
      const progressPercent = Math.min(1, Math.max(0, progressSec / SECONDS_PER_SLOT));
      const currentTime = progressPercent * SECONDS_PER_SLOT * 1000;

      simulatedTimeRef.current = currentTime;
      timeRef.current = currentTime;

      // Always update state on initialization
      setCurrentTimeMs(currentTime);
      setDisplayTimeMs(currentTime);
      lastStateUpdateRef.current = Date.now();
      lastTimeDisplayUpdateRef.current = Date.now();
    }
    
    // Reset last update timestamp
    lastUpdateRef.current = Date.now();
  }, [clock, slotOffset]);
  
  // Provide context value
  const value = {
    currentTimeMs,
    displayTimeMs, // More frequently updated time value for the time display
    currentSlot,
    isPlaying,
    play,
    pause,
    togglePlayPause,
    getCurrentTimeMs,
  };
  
  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
};

// Hook for consuming the timeline context
export function useTimeline() {
  const context = useContext(TimelineContext);
  if (context === undefined) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}

export default useTimeline;