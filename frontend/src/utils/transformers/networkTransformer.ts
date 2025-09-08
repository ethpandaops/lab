import {
  Network,
  ListNetworksResponse,
  ListNodesResponse,
} from '@/api/gen/backend/pkg/api/v1/proto/public_pb';

/**
 * Network summary structure
 */
export interface NetworkSummary {
  name: string;
  status: string;
  chainId: string;
  lastUpdated: string;
  nodeCount?: number;
}

/**
 * Transformed nodes structure
 */
export interface TransformedNodes {
  nodes: any[];
  totalCount: number;
  pageSize: number;
  nextPageToken?: string;
}

/**
 * Transform a network response to summary format
 */
export function transformNetworkResponse(response: ListNetworksResponse): NetworkSummary[] {
  return response.networks.map(network => ({
    name: network.name,
    status: network.status,
    chainId: network.chainId.toString(),
    lastUpdated: network.lastUpdated,
    nodeCount: 0, // This would need to be fetched separately
  }));
}

/**
 * Transform nodes response to a simplified format
 */
export function transformNodesResponse(response: ListNodesResponse): TransformedNodes {
  return {
    nodes: response.nodes,
    totalCount: response.nodes.length,
    pageSize: response.pagination?.pageSize || 100,
    nextPageToken: response.pagination?.nextPageToken,
  };
}

/**
 * Get active networks from a list
 */
export function getActiveNetworks(networks: Network[]): Network[] {
  return networks.filter(network => network.status === 'active');
}

/**
 * Sort networks by a standard order
 */
export function sortNetworksByPriority(networks: Network[]): Network[] {
  const priority = ['mainnet', 'holesky', 'sepolia'];

  return networks.sort((a, b) => {
    const aIndex = priority.indexOf(a.name);
    const bIndex = priority.indexOf(b.name);

    // If both are in priority list, sort by priority
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only one is in priority list, it comes first
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // Otherwise, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Extract network names from response
 */
export function extractNetworkNames(response: ListNetworksResponse): string[] {
  return response.networks.map(network => network.name);
}
