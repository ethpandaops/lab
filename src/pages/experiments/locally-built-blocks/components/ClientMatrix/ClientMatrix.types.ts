import type { FctPreparedBlock } from '@/api/types.gen';

export interface ClientMatrixProps {
  blocks: FctPreparedBlock[];
  executionClients: string[];
  consensusClients: string[];
}
