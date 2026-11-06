import type { SlotBlocksGroup, BlockCountMap } from '../../hooks';

export interface SlotTimelineProps {
  slotGroups: SlotBlocksGroup[];
  allExecutionClients: string[];
  allConsensusClients: string[];
  blockCountMap: BlockCountMap;
  maxBlockCount: number;
}
