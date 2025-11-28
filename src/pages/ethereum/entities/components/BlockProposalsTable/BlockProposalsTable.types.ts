import type { FctBlockProposerEntity } from '@/api/types.gen';

/**
 * Props for BlockProposalsTable component
 */
export interface BlockProposalsTableProps {
  /** Block proposal data */
  blocks: FctBlockProposerEntity[];
}
