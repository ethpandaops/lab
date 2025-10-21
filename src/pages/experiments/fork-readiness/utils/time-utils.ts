const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const SECONDS_PER_EPOCH = SECONDS_PER_SLOT * SLOTS_PER_EPOCH; // 384

export interface TimeToEpochResult {
  days: number;
  hours: number;
  minutes: number;
  totalSeconds: number;
  isPast: boolean;
}

/**
 * Calculate time remaining from current time to target epoch
 * Uses network genesis_time and 12s slots, 32 slots per epoch
 */
export function getTimeToEpoch(targetEpoch: number, genesisTime: number): TimeToEpochResult {
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  const targetTime = genesisTime + targetEpoch * SECONDS_PER_EPOCH;
  const totalSeconds = targetTime - currentTime;

  const isPast = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);

  const days = Math.floor(absSeconds / 86400);
  const hours = Math.floor((absSeconds % 86400) / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);

  return {
    days,
    hours,
    minutes,
    totalSeconds,
    isPast,
  };
}

/**
 * Format time remaining as human-readable string
 * Returns: "8d" | "12h" | "45m" | "Activated"
 */
export function formatTimeRemaining(epochData: TimeToEpochResult): string {
  if (epochData.isPast) {
    return 'Activated';
  }

  if (epochData.days > 0) {
    return `${epochData.days}d`;
  }

  if (epochData.hours > 0) {
    return `${epochData.hours}h`;
  }

  return `${epochData.minutes}m`;
}

/**
 * Get current epoch based on genesis time
 */
export function getCurrentEpoch(genesisTime: number): number {
  const currentTime = Math.floor(Date.now() / 1000);
  const secondsSinceGenesis = currentTime - genesisTime;
  return Math.floor(secondsSinceGenesis / SECONDS_PER_EPOCH);
}
