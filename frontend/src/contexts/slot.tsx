import {
  createContext,
  useContext as reactUseContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import type { SlotMode, SlotContextValue, SlotProviderProps, SlotActions } from '@/types/slot';

export const SlotProgressContext = createContext<
  | {
      slotProgress: number;
    }
  | undefined
>(undefined);

export const SlotStateContext = createContext<
  | {
      currentSlot: number;
      isPlaying: boolean;
      mode: SlotMode;
      isStalled: boolean;
      isStale: boolean;
      staleBehindSlots: number;
    }
  | undefined
>(undefined);

export const SlotConfigContext = createContext<
  | {
      slotDuration: number;
      playbackSpeed: number;
      minSlot: number;
      maxSlot: number;
    }
  | undefined
>(undefined);

export const SlotActionsContext = createContext<SlotActions | undefined>(undefined);

export function SlotProvider({
  children,
  bounds,
  network,
  initialSlot,
  initialMode = 'continuous',
  initialPlaying = true,
}: SlotProviderProps) {
  const beaconClock = useBeaconClock(network);
  const navigate = useNavigate();

  const { minSlot, maxSlot } = bounds;

  const getInitialSlot = () => {
    if (initialSlot !== undefined) return initialSlot;
    // Use maxSlot as the safe default (what safeSlot used to be)
    if (maxSlot > 0) return Math.max(minSlot, maxSlot);
    if (beaconClock) {
      const currentClockSlot = beaconClock.getCurrentSlot();
      return Math.max(minSlot, currentClockSlot - 2);
    }
    return maxSlot;
  };

  const [currentSlot, setCurrentSlot] = useState<number>(getInitialSlot());
  const [slotProgress, setSlotProgress] = useState<number>(0);
  const slotProgressRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying);
  const [mode, setMode] = useState<SlotMode>(initialMode);
  const [slotDuration, setSlotDurationState] = useState<number>(12000);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isStalled, setIsStalled] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<'manual' | 'boundary' | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevNetworkRef = useRef<string>(network);
  const stateRef = useRef({
    isPlaying,
    slotDuration,
    mode,
    maxSlot,
    playbackSpeed,
    currentSlot,
  });

  // Reset slot when network changes
  useEffect(() => {
    if (network !== prevNetworkRef.current) {
      prevNetworkRef.current = network;
      const newInitialSlot = getInitialSlot();
      setCurrentSlot(newInitialSlot);
      setSlotProgress(0);
      slotProgressRef.current = 0;
      // Keep playing state if it was playing
      if (isPlaying && initialPlaying) {
        setIsPlaying(true);
      }
    }
  }, [network, minSlot, maxSlot]); // Don't include getInitialSlot as it's defined inline

  useEffect(() => {
    if (initialSlot === undefined && beaconClock && currentSlot === maxSlot) {
      const currentClockSlot = beaconClock.getCurrentSlot();
      const calculatedSlot = Math.max(minSlot, currentClockSlot - 2);
      setCurrentSlot(calculatedSlot);
    }
  }, [beaconClock, initialSlot, currentSlot, maxSlot, minSlot]);

  useEffect(() => {
    if (
      !isPlaying &&
      pauseReason === 'boundary' &&
      mode === 'continuous' &&
      currentSlot < maxSlot
    ) {
      setIsPlaying(true);
      setPauseReason(null);
    }
  }, [maxSlot, currentSlot, isPlaying, pauseReason, mode]);

  const wallClockSlot = useMemo(
    () => beaconClock?.getCurrentSlot() ?? maxSlot,
    [beaconClock, maxSlot],
  );
  const staleBehindSlots = wallClockSlot - currentSlot;
  const isStale = staleBehindSlots > 10;

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      slotDuration,
      mode,
      maxSlot,
      playbackSpeed,
      currentSlot,
    };
  });

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const state = stateRef.current;

      if (!state.isPlaying) {
        return;
      }

      const currentProgress = slotProgressRef.current;
      const nextProgress = currentProgress + 100 * state.playbackSpeed;

      if (nextProgress >= state.slotDuration) {
        if (state.mode === 'continuous') {
          setCurrentSlot(current => {
            const nextSlot = current + 1;
            if (nextSlot > state.maxSlot) {
              setIsPlaying(false);
              setPauseReason('boundary');
              return current;
            }
            return nextSlot;
          });
          slotProgressRef.current = 0;
          setSlotProgress(0);
        } else {
          setIsPlaying(false);
          slotProgressRef.current = state.slotDuration;
          setSlotProgress(state.slotDuration);
        }
      } else {
        slotProgressRef.current = nextProgress;
        setSlotProgress(nextProgress);
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Disabled URL sync for performance testing
  // useEffect(() => {
  //   navigate({
  //     search: { slot: currentSlot, mode, playing: isPlaying },
  //     replace: true,
  //   });
  // }, [currentSlot, mode, isPlaying]);

  const actions = useMemo(
    () => ({
      play: () => {
        setIsPlaying(true);
        setPauseReason(null);
      },
      pause: () => {
        setIsPlaying(false);
        setPauseReason('manual');
      },
      toggle: () => {
        setIsPlaying(prev => {
          setPauseReason(prev ? 'manual' : null);
          return !prev;
        });
      },
      setMode: (newMode: SlotMode) => setMode(newMode),
      goToSlot: (slot: number) => {
        const bounded = Math.max(minSlot, Math.min(maxSlot, slot));
        setCurrentSlot(bounded);
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },
      nextSlot: () => {
        setCurrentSlot(prev => {
          const next = prev + 1;
          return next > maxSlot ? prev : next;
        });
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },
      previousSlot: () => {
        setCurrentSlot(prev => {
          const next = prev - 1;
          return next < minSlot ? prev : next;
        });
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },
      rewind: () => {
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },
      fastForward: () => {
        slotProgressRef.current = slotDuration;
        setSlotProgress(slotDuration);
      },
      seekToTime: (ms: number) => {
        const bounded = Math.max(0, Math.min(slotDuration, ms));
        slotProgressRef.current = bounded;
        setSlotProgress(bounded);
      },
      setSlotDuration: (ms: number) => setSlotDurationState(ms),
      setPlaybackSpeed: (speed: number) => setPlaybackSpeed(speed),
      markStalled: () => {
        setIsStalled(true);
        setIsPlaying(false);
      },
      clearStalled: () => setIsStalled(false),
    }),
    [minSlot, maxSlot, slotDuration],
  );

  const progressValue = useMemo(
    () => ({
      slotProgress,
    }),
    [slotProgress],
  );

  const stateValue = useMemo(
    () => ({
      currentSlot,
      isPlaying,
      mode,
      isStalled,
      isStale,
      staleBehindSlots,
    }),
    [currentSlot, isPlaying, mode, isStalled, isStale, staleBehindSlots],
  );

  const configValue = useMemo(
    () => ({
      slotDuration,
      playbackSpeed,
      minSlot,
      maxSlot,
    }),
    [slotDuration, playbackSpeed, minSlot, maxSlot],
  );

  return (
    <SlotActionsContext.Provider value={actions}>
      <SlotConfigContext.Provider value={configValue}>
        <SlotStateContext.Provider value={stateValue}>
          <SlotProgressContext.Provider value={progressValue}>
            {children}
          </SlotProgressContext.Provider>
        </SlotStateContext.Provider>
      </SlotConfigContext.Provider>
    </SlotActionsContext.Provider>
  );
}

export function useSlotProgress() {
  const context = reactUseContext(SlotProgressContext);
  if (context === undefined) {
    throw new Error('useSlotProgress must be used within a SlotProvider');
  }
  return context;
}

export function useSlotState() {
  const context = reactUseContext(SlotStateContext);
  if (context === undefined) {
    throw new Error('useSlotState must be used within a SlotProvider');
  }
  return context;
}

export function useSlotConfig() {
  const context = reactUseContext(SlotConfigContext);
  if (context === undefined) {
    throw new Error('useSlotConfig must be used within a SlotProvider');
  }
  return context;
}

export function useSlotActions() {
  const context = reactUseContext(SlotActionsContext);
  if (context === undefined) {
    throw new Error('useSlotActions must be used within a SlotProvider');
  }
  return context;
}

export function useSlot(): SlotContextValue {
  const progress = useSlotProgress();
  const state = useSlotState();
  const config = useSlotConfig();
  const actions = useSlotActions();

  return {
    ...progress,
    ...state,
    ...config,
    actions,
  };
}
