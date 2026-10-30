import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import { WINDOW_STEP_SLOTS } from '../constants';
import { getSlotWindow } from '../utils/node-stats';

export interface SlotWindow {
  network: string;
  startSlot: number;
  /** Exclusive */
  endSlot: number;
  /** Unix seconds of `startSlot` */
  startTime: number;
  /** Unix seconds of `endSlot` (exclusive) */
  endTime: number;
}

/**
 * The last `size` completed slots on the current network, moving every few slots.
 *
 * @returns null until the network and beacon clock are known
 */
export function useSlotWindow(size: number): SlotWindow | null {
  const { currentNetwork } = useNetwork();
  const { slot } = useBeaconClock();

  if (!currentNetwork || slot <= 0) return null;

  const { startSlot, endSlot } = getSlotWindow(slot, size, WINDOW_STEP_SLOTS);
  return {
    network: currentNetwork.name,
    startSlot,
    endSlot,
    startTime: slotToTimestamp(startSlot, currentNetwork.genesis_time),
    endTime: slotToTimestamp(endSlot, currentNetwork.genesis_time),
  };
}
