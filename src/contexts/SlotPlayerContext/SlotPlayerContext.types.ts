import type { ReactNode } from 'react';

export type SlotMode = 'continuous' | 'single';
export type PauseReason = 'manual' | 'boundary' | null;

export interface SlotPlayerProgressContextValue {
  slotProgress: number;
}

export interface SlotPlayerStateContextValue {
  currentSlot: number;
  isPlaying: boolean;
  mode: SlotMode;
  isStalled: boolean;
  isStale: boolean;
  staleBehindSlots: number;
  isLive: boolean;
  pauseReason: PauseReason;
}

export interface SlotPlayerConfigContextValue {
  slotDuration: number;
  playbackSpeed: number;
  minSlot: number;
  maxSlot: number;
}

export interface SlotPlayerActions {
  // Playback controls
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setMode: (mode: SlotMode) => void;

  // Navigation
  goToSlot: (slot: number) => void;
  nextSlot: () => void;
  previousSlot: () => void;

  // Seek within slot
  rewind: () => void;
  fastForward: () => void;
  seekToTime: (ms: number) => void;

  // Settings
  setSlotDuration: (ms: number) => void;
  setPlaybackSpeed: (speed: number) => void;

  // State management
  markStalled: () => void;
  clearStalled: () => void;
  jumpToLive: () => void;
}

export interface SlotPlayerCallbacks {
  // Called when the current slot changes
  onSlotChange?: (slot: number) => void;
  // Called when play state changes
  onPlayStateChange?: (isPlaying: boolean, reason: PauseReason) => void;
  // Called when playback becomes stalled
  onStalled?: () => void;
}

export interface SlotPlayerProviderProps {
  children: ReactNode;
  // Tables to get bounds from (e.g., ['fct_block', 'fct_attestation'])
  tables: string[];
  // Initial slot to start at (defaults to maxSlot - 2)
  initialSlot?: number;
  // Initial playback mode
  initialMode?: SlotMode;
  // Whether to start playing immediately
  initialPlaying?: boolean;
  // Slot duration in milliseconds (default: 12000)
  slotDuration?: number;
  // Initial playback speed
  playbackSpeed?: number;
  // Event callbacks
  callbacks?: SlotPlayerCallbacks;
}

export interface SlotPlayerMetaContextValue {
  isLoading: boolean;
  error: Error | null;
}

export interface SlotPlayerContextValue
  extends SlotPlayerProgressContextValue,
    SlotPlayerStateContextValue,
    SlotPlayerConfigContextValue,
    SlotPlayerMetaContextValue {
  actions: SlotPlayerActions;
}
