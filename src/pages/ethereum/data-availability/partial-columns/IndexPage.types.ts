import { z } from 'zod';

/** Available time periods for the partial columns charts */
export type TimePeriod = '24h' | '7d' | '30d' | '90d' | 'all';

/** Zod schema for the partial columns page search params */
export const partialColumnsSearchSchema = z.object({
  /** Time period */
  t: z.enum(['24h', '7d', '30d', '90d', 'all']).optional(),
  /** Consensus client of the sentry nodes the completion and partial message charts describe */
  sentry: z.string().optional(),
});

export type PartialColumnsSearch = z.infer<typeof partialColumnsSearchSchema>;

/** How a sentry node completed a custody column */
export type CompletionPath = 'FULL_GOSSIP' | 'PARTIAL_GOSSIP' | 'EL' | 'RECONSTRUCTION' | 'UNKNOWN';

/** Column completions on one completion path by one sentry client in a time bucket */
export interface PathRecord {
  /** Time bucket key: unix seconds for hourly buckets, YYYY-MM-DD for daily buckets */
  key: string;
  /** Consensus client of the sentry nodes */
  sentryClient: string;
  path: CompletionPath;
  nodes: number;
  completions: number;
  cellsTotal: number;
  cellsFromGossip: number;
  cellsFromEl: number;
  avgContributingPeers: number;
  p50: number;
  p90: number;
  p99: number;
}

/** Partial message traffic and verdicts of one sentry client in a time bucket */
export interface PartialRecord {
  key: string;
  sentryClient: string;
  nodes: number;
  receivedMetadata: number;
  receivedMessages: number;
  receivedCellMessages: number;
  receivedCells: number;
  receivedHeaders: number;
  cellSenderPeers: number;
  sentMetadata: number;
  sentMessages: number;
  sentCellMessages: number;
  sentCells: number;
  sentHeaders: number;
  cellsAccept: number;
  cellsIgnore: number;
  cellsReject: number;
  verdictCells: number;
  newCells: number;
  headerAccept: number;
  headerIgnore: number;
  headerReject: number;
  headerNodeBlocks: number;
  p50HeaderSeen: number;
  p90HeaderSeen: number;
}

/** Peers of one client version seen by sentry nodes in a time bucket */
export interface PeerRecord {
  key: string;
  /** Peer client implementation, unknown when no heartbeat identified it */
  client: string;
  version: string;
  connected: number;
  gossipsubV13: number;
  subscribed: number;
  requestsPartial: number;
  supportsSendingPartial: number;
}
