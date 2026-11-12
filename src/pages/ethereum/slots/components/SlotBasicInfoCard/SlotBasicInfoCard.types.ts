import type { SlotDetailData } from '@/pages/ethereum/slots/hooks/useSlotDetailData';

export interface SlotBasicInfoCardProps {
  slot: number;
  epoch: number;
  data: SlotDetailData;
  /** Whether this slot had no block proposed (missed slot) */
  isMissedSlot?: boolean;
  /** A table's first slot time when this slot predates it, from useSlotTableCoverage */
  dataStart: (table: string) => number | undefined;
}
