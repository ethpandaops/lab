import type { ReactNode } from 'react';

export type SlotMode = 'continuous' | 'single';

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

export interface SlotPlayerProviderProps {
  children: ReactNode;
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
  // Table name to get bounds from (default: 'fct_slot')
  tableName?: string;
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
