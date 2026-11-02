import { useMemo } from 'react';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { useActiveNodes } from '@/pages/xatu/nodes/hooks/useActiveNodes';
import { extractExecutionClient, normalizeClientName } from '@/utils/ethereum';
import type { ClientLayer } from '../utils/client-share';

export interface UseClientNodesResult {
  /** Contributoor nodes running the client */
  nodes: FctNodeActiveLast24h[];
  /** Every node that reported in the last 24 hours */
  allNodes: FctNodeActiveLast24h[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Contributoor nodes active in the last 24 hours that run the client. Nodes report their consensus client;
 * an execution client is only known from ethPandaOps node names.
 */
export function useClientNodes(client: string | undefined, layer: ClientLayer | null): UseClientNodesResult {
  const { nodes: allNodes, isLoading, error } = useActiveNodes();
  const nodes = useMemo(
    () =>
      !client || !layer
        ? []
        : allNodes.filter(node =>
            layer === 'consensus'
              ? normalizeClientName(node.meta_consensus_implementation ?? '') === client
              : extractExecutionClient(node.meta_client_name) === client
          ),
    [allNodes, client, layer]
  );
  return { nodes, allNodes, isLoading, error };
}
