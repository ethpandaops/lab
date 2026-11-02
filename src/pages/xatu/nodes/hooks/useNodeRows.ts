import { useMemo } from 'react';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { compareVersions } from '@/utils/version';
import { summarizeByNode, type RangeSummary } from '../utils/history';
import { isNodeOnline, median } from '../utils/node-stats';
import type { DimClientRelease } from '@/api/types.gen';
import { normalizeClientName } from '@/utils/ethereum';
import { useLatestReleases } from '@/pages/ethereum/clients/hooks/useClientReleases';
import { displayVersion } from '@/pages/ethereum/clients/utils/client-versions';
import { useActiveNodes } from './useActiveNodes';
import { useNodeHistory, type NodeHistory } from './useNodeHistory';

/** One node's typical timings over the last 24 hours */
export interface NodeObservation {
  blockP50: number | null;
  attestationP50: number | null;
  /** Slots the node saw a block in */
  blockSlots: number;
}

/** One active node joined with its last-24h timings */
export interface NodeRow {
  nodeId: string;
  node: FctNodeActiveLast24h;
  online: boolean;
  observation: NodeObservation | null;
  /** Consensus client release the node runs, or its short version when it matches no release */
  clientVersion: string;
  /** The client's latest release, null when dim_client_release has none for it */
  latestVersion: string | null;
  /** The client's latest release, when the node runs an older one */
  newerVersion: string | null;
}

export interface UseNodeRowsResult {
  rows: NodeRow[];
  /** Median across nodes of each node's last-24h median */
  network: { blockP50: number | null; attestationP50: number | null };
  /** Block rollups of every node over the last 24 hours */
  block24h: NodeHistory | null;
  isLoading: boolean;
  timingsLoading: boolean;
  error: Error | null;
}

/**
 * Join active nodes with their last-24h timings and whether their consensus client is behind its latest release,
 * most recently seen first.
 */
export function buildNodeRows(
  nodes: FctNodeActiveLast24h[],
  block: Map<string, RangeSummary>,
  attestation: Map<string, RangeSummary>,
  nowSeconds: number,
  latest: Map<string, DimClientRelease> = new Map(),
  releases: Map<string, DimClientRelease[]> = new Map()
): NodeRow[] {
  return nodes
    .filter((node): node is FctNodeActiveLast24h & { node_id: string } => !!node.node_id)
    .map(node => {
      const client = normalizeClientName(node.meta_consensus_implementation ?? '');
      const clientVersion = displayVersion(node.meta_consensus_version, releases.get(client) ?? []);
      const newest = latest.get(client)?.version;
      const outdated = !!newest && !!clientVersion && compareVersions(clientVersion, newest) < 0;
      const blockSummary = block.get(node.node_id);
      const attestationSummary = attestation.get(node.node_id);
      return {
        nodeId: node.node_id,
        node,
        online: isNodeOnline(node.last_seen_date_time, nowSeconds),
        observation:
          blockSummary || attestationSummary
            ? {
                blockP50: blockSummary?.p50 ?? null,
                attestationP50: attestationSummary?.p50 ?? null,
                blockSlots: blockSummary?.count ?? 0,
              }
            : null,
        clientVersion,
        latestVersion: newest ?? null,
        newerVersion: outdated ? newest! : null,
      };
    })
    .sort((a, b) => (b.node.last_seen_date_time ?? 0) - (a.node.last_seen_date_time ?? 0));
}

/**
 * Every active node with its block and attestation timings over the last 24 hours.
 */
export function useNodeRows(): UseNodeRowsResult {
  const { nodes, isLoading, error } = useActiveNodes();
  const block = useNodeHistory('block', '24h', {});
  const attestation = useNodeHistory('attestation', '24h', {});
  const { latest, releases } = useLatestReleases();

  const { rows, network } = useMemo(() => {
    const blockSummaries = summarizeByNode(block.data?.rows ?? []);
    const attestationSummaries = summarizeByNode(attestation.data?.rows ?? []);
    return {
      rows: buildNodeRows(nodes, blockSummaries, attestationSummaries, Date.now() / 1000, latest, releases),
      network: {
        blockP50: median([...blockSummaries.values()].map(summary => summary.p50)),
        attestationP50: median([...attestationSummaries.values()].map(summary => summary.p50)),
      },
    };
  }, [nodes, block.data, attestation.data, latest, releases]);

  return {
    rows,
    network,
    block24h: block.data,
    isLoading,
    timingsLoading: block.isLoading || attestation.isLoading,
    // Missing timings leave the table's timing columns empty; only the node list is required
    error,
  };
}
