import type { BlockDetailsData } from '../../hooks/useBlockDetailsData';
import type { PhaseData } from '@/components/Ethereum/SlotProgressTimeline';

export interface BlockDetailsCardProps {
  data: BlockDetailsData | null;
  /** Current time in milliseconds from slot start (0-12000) */
  currentTime: number;
  /** Phase data for slot progress timeline */
  slotProgressPhases: PhaseData[];
}
