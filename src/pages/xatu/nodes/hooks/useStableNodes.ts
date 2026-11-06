import { useQueries } from '@tanstack/react-query';
import { dimXatuNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';

/** Hashed node names start with these; named nodes never rotate and are their own node */
const HASHED_NAME_PREFIXES = ['pub-', 'corp-'] as const;

export interface UseStableNodesResult {
  /** Node ID → the Xatu node it belongs to; an ID missing from it is its own node */
  stable: Map<string, string>;
  isLoading: boolean;
}

/**
 * Maps each Xatu node ID to the node it belongs to. A hashed node ID changes whenever the beacon node's p2p key
 * changes (every restart on nimbus without --netkey-file), and dim_xatu_node chains those IDs back into one node.
 */
export function useStableNodes(): UseStableNodesResult {
  const { currentNetwork } = useNetwork();

  return useQueries({
    queries: HASHED_NAME_PREFIXES.map(prefix => ({
      ...dimXatuNodeServiceListOptions({ query: { meta_client_name_starts_with: prefix, page_size: 10000 } }),
      enabled: !!currentNetwork,
    })),
    combine: results => {
      const stable = new Map<string, string>();
      results.forEach(result =>
        result.data?.dim_xatu_node?.forEach(row => {
          if (row.meta_client_name && row.stable_node_id) {
            stable.set(nodeIdOf(row.meta_client_name), nodeIdOf(row.stable_node_id));
          }
        })
      );
      return { stable, isLoading: results.some(result => result.isLoading) };
    },
  });
}

/** The node ID part of a Xatu node name, e.g. `hashed-1a2b3c4d` from `pub-asn-city/<user>/hashed-1a2b3c4d` */
function nodeIdOf(name: string): string {
  return name.slice(name.lastIndexOf('/') + 1);
}
