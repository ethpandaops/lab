import type { ClientPairingMap, ParsedBlock } from '../../hooks';

export interface ClientPairingMatrixProps {
  executionClients: string[];
  consensusClients: string[];
  pairingMap: ClientPairingMap;
  maxPairingCount: number;
  allBlocks: ParsedBlock[];
}
