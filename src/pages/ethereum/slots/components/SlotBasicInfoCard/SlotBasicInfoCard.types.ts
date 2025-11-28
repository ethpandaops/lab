import type { SlotDetailData } from '../../hooks/useSlotDetailData';

export interface SlotBasicInfoCardProps {
  slot: number;
  epoch: number;
  data: SlotDetailData;
}
