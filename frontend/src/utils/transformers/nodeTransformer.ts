import { Node, ListNodesResponse } from '@/api/gen/backend/pkg/api/v1/proto/public_pb';

/**
 * ContributorNode structure used by the UI
 */
export interface ContributorNode {
  network: string;
  client_name: string;
  consensus_client: string;
  consensus_version: string;
  country: string;
  city: string;
  continent: string;
  latest_slot: number;
  latest_slot_start_date_time: number;
  client_implementation: string;
  client_version: string;
}

/**
 * Country data structure
 */
export interface CountryData {
  name: string;
  total_nodes: number;
  public_nodes: number;
}

/**
 * User/Contributor data structure
 */
export interface UserData {
  name: string;
  node_count: number;
  updated_at: number;
}

/**
 * Consensus implementation data
 */
export interface ConsensusImplementation {
  total_nodes: number;
  public_nodes: number;
}

/**
 * Aggregated nodes structure
 */
export interface AggregatedNodes {
  nodes: (Node & { network?: string })[];
  byNetwork: Record<string, Node[]>;
  totalCount: number;
}

/**
 * Contributor summary structure
 */
export interface ContributorSummary {
  contributors: UserData[];
  updated_at: number;
}

/**
 * Network data structure
 */
export interface NetworkData {
  total_nodes: number;
  total_public_nodes: number;
  countries: Record<string, CountryData>;
  continents: Record<string, CountryData>;
  cities: Record<string, CountryData>;
  consensus_implementations: Record<string, ConsensusImplementation>;
}

/**
 * Derive continent name from continent code
 */
export function deriveContinentFromCode(continentCode?: string): string {
  if (!continentCode) return '';

  const continentMap: Record<string, string> = {
    AF: 'Africa',
    AN: 'Antarctica',
    AS: 'Asia',
    EU: 'Europe',
    NA: 'North America',
    OC: 'Oceania',
    SA: 'South America',
  };

  return continentMap[continentCode] || continentCode;
}

/**
 * Transform a Node to ContributorNode format
 */
export function transformNodeToContributor(node: Node, network?: string): ContributorNode {
  return {
    network: network || 'unknown',
    client_name: node.client?.name || '',
    consensus_client: node.consensus?.implementation || '',
    consensus_version: node.consensus?.version || '',
    country: node.geo?.country || '',
    city: node.geo?.city || '',
    continent: deriveContinentFromCode(node.geo?.continentCode),
    latest_slot: 0, // This would need a separate endpoint or additional data
    latest_slot_start_date_time: node.lastSeen ? new Date(node.lastSeen).getTime() / 1000 : 0,
    client_implementation: node.client?.implementation || '',
    client_version: node.client?.version || '',
  };
}

/**
 * Aggregate nodes by country
 */
export function aggregateNodesByCountry(nodes: Node[]): Record<string, CountryData> {
  const countries: Record<string, CountryData> = {};

  nodes.forEach(node => {
    const country = node.geo?.country || 'Unknown';
    if (!countries[country]) {
      countries[country] = {
        name: country,
        total_nodes: 0,
        public_nodes: 0,
      };
    }
    countries[country].total_nodes++;
    countries[country].public_nodes++; // All nodes from the API are public
  });

  return countries;
}

/**
 * Aggregate nodes by city
 */
export function aggregateNodesByCity(nodes: Node[]): Record<string, CountryData> {
  const cities: Record<string, CountryData> = {};

  nodes.forEach(node => {
    const city = node.geo?.city || 'Unknown';
    if (!cities[city]) {
      cities[city] = {
        name: city,
        total_nodes: 0,
        public_nodes: 0,
      };
    }
    cities[city].total_nodes++;
    cities[city].public_nodes++; // All nodes from the API are public
  });

  return cities;
}

/**
 * Aggregate nodes by continent
 */
export function aggregateNodesByContinents(nodes: Node[]): Record<string, CountryData> {
  const continents: Record<string, CountryData> = {};

  nodes.forEach(node => {
    const continent = deriveContinentFromCode(node.geo?.continentCode) || 'Unknown';
    if (!continents[continent]) {
      continents[continent] = {
        name: continent,
        total_nodes: 0,
        public_nodes: 0,
      };
    }
    continents[continent].total_nodes++;
    continents[continent].public_nodes++; // All nodes from the API are public
  });

  return continents;
}

/**
 * Aggregate nodes by consensus client
 */
export function aggregateNodesByClient(nodes: Node[]): Record<string, ConsensusImplementation> {
  const clients: Record<string, ConsensusImplementation> = {};

  nodes.forEach(node => {
    const client = node.consensus?.implementation || 'unknown';
    if (!clients[client]) {
      clients[client] = {
        total_nodes: 0,
        public_nodes: 0,
      };
    }
    clients[client].total_nodes++;
    clients[client].public_nodes++; // All nodes from the API are public
  });

  return clients;
}

/**
 * Aggregate nodes by user/contributor
 */
export function aggregateNodesByUser(nodes: Node[]): UserData[] {
  const userMap = new Map<string, UserData>();

  nodes.forEach(node => {
    const username = node.username || 'anonymous';
    const existing = userMap.get(username) || {
      name: username,
      node_count: 0,
      updated_at: 0,
    };
    existing.node_count++;
    existing.updated_at = Math.max(
      existing.updated_at,
      node.lastSeen ? new Date(node.lastSeen).getTime() / 1000 : 0,
    );
    userMap.set(username, existing);
  });

  return Array.from(userMap.values());
}

/**
 * Aggregate nodes from multiple network responses
 */
export function aggregateNodesFromNetworks(
  responses: ListNodesResponse[],
  networks: string[],
): AggregatedNodes {
  const allNodes: (Node & { network?: string })[] = [];
  const byNetwork: Record<string, Node[]> = {};

  responses.forEach((response, index) => {
    const network = networks[index];
    byNetwork[network] = response.nodes;

    // Tag each node with its network for tracking
    response.nodes.forEach(node => {
      allNodes.push({ ...node, network });
    });
  });

  return {
    nodes: allNodes,
    byNetwork,
    totalCount: allNodes.length,
  };
}

/**
 * Group nodes by network
 */
export function groupNodesByNetwork(
  nodes: (Node & { network?: string })[],
): Record<string, Node[]> {
  const grouped: Record<string, Node[]> = {};

  nodes.forEach(node => {
    const network = node.network || 'unknown';
    if (!grouped[network]) {
      grouped[network] = [];
    }
    grouped[network].push(node);
  });

  return grouped;
}

/**
 * Build contributor summary from nodes
 */
export function aggregateContributorSummary(nodes: Node[]): ContributorSummary {
  const userMap = new Map<string, UserData>();

  nodes.forEach(node => {
    const username = node.username || 'anonymous';
    const existing = userMap.get(username) || {
      name: username,
      node_count: 0,
      updated_at: 0,
    };
    existing.node_count++;
    existing.updated_at = Math.max(
      existing.updated_at,
      node.lastSeen ? new Date(node.lastSeen).getTime() / 1000 : 0,
    );
    userMap.set(username, existing);
  });

  return {
    contributors: Array.from(userMap.values()),
    updated_at: Date.now() / 1000,
  };
}

/**
 * Transform nodes response to UI format
 */
export function transformNodesToUIFormat(response: ListNodesResponse): ContributorNode[] {
  return response.nodes.map(node => transformNodeToContributor(node));
}
