import type { FctNodeActiveLast24h } from '@/api';

export interface ClientReadinessData {
  clientName: string; // "lighthouse" | "prysm" | "nimbus" | "lodestar" | "teku"
  totalNodes: number;
  readyNodes: number;
  readyPercentage: number;
  /** From config; null when the fork sets no minimum for this client */
  minVersion: string | null;
  nodes: NodeReadinessStatus[];
}

export interface NodeReadinessStatus {
  nodeName: string; // meta_client_name
  nodeId?: string; // node_id, for linking to the node page
  username?: string; // username for linking to contributor detail page
  version: string; // meta_client_version
  isReady: boolean;
  classification?: string;
  lastSeen?: number;
}

export interface ForkReadinessStats {
  forkName: string;
  forkEpoch: number;
  timeRemaining: string;
  isPast: boolean; // Whether fork has already activated
  overallReadyPercentage: number;
  totalNodes: number;
  readyNodes: number;
  actionNeededCount: number;
  /** Clients with a minimum version first, then clients without one */
  clientReadiness: ClientReadinessData[];
  readyClientsCount: number;
  totalClientsCount: number;
  /** Nodes whose client has no minimum version for the fork; not in the totals above */
  noMinimumCount: number;
}

export interface ProcessNodesParams {
  allNodes: FctNodeActiveLast24h[];
  minClientVersions: Record<string, string>; // From config
}
