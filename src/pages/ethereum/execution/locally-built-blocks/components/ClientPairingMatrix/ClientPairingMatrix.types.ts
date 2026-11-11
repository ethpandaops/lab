import type { ClientPairingMap, ParsedBlock } from '@/pages/ethereum/execution/locally-built-blocks/hooks';

export interface ClientPairingMatrixProps {
  executionClients: string[];
  consensusClients: string[];
  pairingMap: ClientPairingMap;
  maxPairingCount: number;
  allBlocks: ParsedBlock[];
}
