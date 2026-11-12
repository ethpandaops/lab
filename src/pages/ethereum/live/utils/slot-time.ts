import { SECONDS_PER_SLOT } from '@/utils/beacon';

/**
 * Converts a beacon chain slot number to Unix timestamp
 * @param slot - Beacon chain slot number
 * @param genesisTime - Network genesis time (Unix timestamp in seconds)
 * @returns Unix timestamp in seconds (uint32)
 */
export function slotToTimestamp(slot: number, genesisTime: number): number {
  return genesisTime + slot * SECONDS_PER_SLOT;
}

/**
 * Converts Unix timestamp to beacon chain slot number
 * @param timestamp - Unix timestamp in seconds
 * @param genesisTime - Network genesis time (Unix timestamp in seconds)
 * @returns Beacon chain slot number
 */
export function timestampToSlot(timestamp: number, genesisTime: number): number {
  return Math.floor((timestamp - genesisTime) / SECONDS_PER_SLOT);
}
