import type { ReactNode } from 'react';
import type { GetExperimentConfigResponse } from '@/api/gen/backend/pkg/api/v1/proto/public_pb';

export type SlotMode = 'continuous' | 'single';

export function isSlotBasedExperiment(config: GetExperimentConfigResponse): boolean {
  return !!config.experiment?.dataAvailability;
}

export function extractSlotBounds(
  config: GetExperimentConfigResponse,
  network: string,
): SlotBounds | null {
  const dataAvailability = config.experiment?.dataAvailability
    ? (config.experiment.dataAvailability as Record<string, unknown>)[network]
    : undefined;

  if (!dataAvailability) {
    return null;
  }

  return {
    minSlot: Number(dataAvailability.minSlot ?? 0),
    maxSlot: Number(dataAvailability.maxSlot ?? 0),
  };
}

export interface SlotContextValue {
  currentSlot: number;
  slotProgress: number;
  isPlaying: boolean;
  mode: SlotMode;
  slotDuration: number;
  playbackSpeed: number;
  minSlot: number;
  maxSlot: number;
  isStalled: boolean;
  isStale: boolean;
  staleBehindSlots: number;
  actions: SlotActions;
}

export interface SlotActions {
  play(): void;
  pause(): void;
  toggle(): void;
  setMode(mode: SlotMode): void;
  goToSlot(slot: number): void;
  nextSlot(): void;
  previousSlot(): void;
  rewind(): void;
  fastForward(): void;
  seekToTime(ms: number): void;
  setSlotDuration(ms: number): void;
  setPlaybackSpeed(speed: number): void;
  markStalled(): void;
  clearStalled(): void;
}

export interface SlotBounds {
  minSlot: number;
  maxSlot: number;
}

export interface SlotProviderProps {
  children: ReactNode;
  bounds: SlotBounds;
  network: string;
  initialSlot?: number;
  initialMode?: SlotMode;
  initialPlaying?: boolean;
}
