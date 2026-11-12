import type { SlotBlocksGroup, BlockCountMap } from '@/pages/ethereum/execution/locally-built-blocks/hooks';

export interface SlotTimelineProps {
  slotGroups: SlotBlocksGroup[];
  allExecutionClients: string[];
  allConsensusClients: string[];
  blockCountMap: BlockCountMap;
  maxBlockCount: number;
}
