import type { FctNodeActiveLast24h } from '@/api';
import { meetsMinVersion } from './version-comparison';
import type {
  ClientReadinessData,
  NodeReadinessStatus,
  ForkReadinessStats,
  ProcessNodesParams,
} from './fork-data-processor.types';

/**
 * Get list of supported client names from config min versions
 * Returns: ["lighthouse", "prysm", "nimbus", "lodestar", "teku"]
 */
function getSupportedClients(minVersions: Record<string, string>): string[] {
  return Object.keys(minVersions);
}

/**
 * Group nodes by consensus implementation (lighthouse, prysm, etc.)
 * Returns: Map<clientName, FctNodeActiveLast24h[]>
 */
function groupNodesByClient(nodes: FctNodeActiveLast24h[]): Map<string, FctNodeActiveLast24h[]> {
  const grouped = new Map<string, FctNodeActiveLast24h[]>();

  for (const node of nodes) {
    const clientName = node.meta_consensus_implementation?.toLowerCase() || 'unknown';
    if (!grouped.has(clientName)) {
      grouped.set(clientName, []);
    }
    grouped.get(clientName)?.push(node);
  }

  return grouped;
}

/**
 * Calculate readiness for a specific client implementation
 * Compares all node versions against minVersion
 */
function calculateClientReadiness(
  clientName: string,
  nodes: FctNodeActiveLast24h[],
  minVersion: string
): ClientReadinessData {
  const nodeStatuses: NodeReadinessStatus[] = [];
  let readyCount = 0;

  for (const node of nodes) {
    const version = node.meta_consensus_version || 'unknown';
    const isReady = version !== 'unknown' && meetsMinVersion(version, minVersion);

    if (isReady) {
      readyCount++;
    }

    nodeStatuses.push({
      nodeName: node.meta_client_name || 'unknown',
      version,
      isReady,
      classification: node.meta_consensus_implementation,
      lastSeen: node.last_seen_date_time,
    });
  }

  const totalNodes = nodes.length;
  const readyPercentage = totalNodes > 0 ? Math.round((readyCount / totalNodes) * 100) : 0;

  return {
    clientName,
    totalNodes,
    readyNodes: readyCount,
    readyPercentage,
    minVersion,
    nodes: nodeStatuses,
  };
}

/**
 * Process all nodes and calculate readiness statistics for a single fork
 * Groups nodes by client implementation, checks versions, calculates percentages
 */
export function processForkReadiness(
  params: ProcessNodesParams,
  _forkName: string,
  _forkEpoch: number,
  _isPast: boolean
): Omit<ForkReadinessStats, 'forkName' | 'forkEpoch' | 'timeRemaining' | 'isPast'> {
  const { allNodes, minClientVersions } = params;

  // Group nodes by client
  const nodesByClient = groupNodesByClient(allNodes);
  const supportedClients = getSupportedClients(minClientVersions);

  // Calculate readiness for each client
  const clientReadiness: ClientReadinessData[] = [];
  let totalReadyNodes = 0;
  let totalNodes = 0;
  let readyClientsCount = 0;
  let clientsWithNodesCount = 0;

  for (const clientName of supportedClients) {
    const clientNodes = nodesByClient.get(clientName.toLowerCase()) || [];
    const minVersion = minClientVersions[clientName];

    if (!minVersion) {
      continue;
    }

    const readinessData = calculateClientReadiness(clientName, clientNodes, minVersion);
    clientReadiness.push(readinessData);

    totalNodes += readinessData.totalNodes;
    totalReadyNodes += readinessData.readyNodes;

    // Count clients that have nodes
    if (readinessData.totalNodes > 0) {
      clientsWithNodesCount++;

      // Count clients that are 100% ready
      if (readinessData.readyPercentage === 100) {
        readyClientsCount++;
      }
    }
  }

  const overallReadyPercentage = totalNodes > 0 ? Math.round((totalReadyNodes / totalNodes) * 100) : 0;
  const actionNeededCount = totalNodes - totalReadyNodes;

  return {
    overallReadyPercentage,
    totalNodes,
    readyNodes: totalReadyNodes,
    actionNeededCount,
    clientReadiness,
    readyClientsCount,
    totalClientsCount: clientsWithNodesCount,
  };
}
