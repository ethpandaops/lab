import type { SlotViewData } from '../../hooks/useSlotViewData';

export interface BottomBarProps {
  slotData: SlotViewData;
  currentTime: number; // milliseconds from slot start (0-12000)
  mode: 'live' | 'static';
}
