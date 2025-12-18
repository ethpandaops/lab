import type { SlotDetailData } from '../../hooks/useSlotDetailData';

export interface SlotBasicInfoCardProps {
  slot: number;
  epoch: number;
  data: SlotDetailData;
  /** Whether this slot had no block proposed (missed slot) */
  isMissedSlot?: boolean;
}
