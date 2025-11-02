import type { FctNodeActiveLast24h } from '@/api';

export interface ClientReadinessData {
  clientName: string; // "lighthouse" | "prysm" | "nimbus" | "lodestar" | "teku"
  totalNodes: number;
  readyNodes: number;
  readyPercentage: number;
  minVersion: string; // From config
  nodes: NodeReadinessStatus[];
}

export interface NodeReadinessStatus {
  nodeName: string; // meta_client_name
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
  clientReadiness: ClientReadinessData[];
  readyClientsCount: number;
  totalClientsCount: number;
}

export interface ProcessNodesParams {
  allNodes: FctNodeActiveLast24h[];
  minClientVersions: Record<string, string>; // From config
}
