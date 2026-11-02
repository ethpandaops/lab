import { useMemo } from 'react';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { compareVersions } from '@/utils/version';
import type { NodeRange } from '../constants';
import { summarizeByNode } from '../utils/history';
import { isNodeOnline, median } from '../utils/node-stats';
import type { DimClientRelease } from '@/api/types.gen';
import { normalizeClientName } from '@/utils/ethereum';
import { useLatestReleases } from '@/pages/ethereum/clients/hooks/useClientReleases';
import { displayVersion } from '@/pages/ethereum/clients/utils/client-versions';
import { useActiveNodes } from './useActiveNodes';
import { useNodeHistory, type HistoryRow, type NodeHistory } from './useNodeHistory';

/** One node's typical timings over the selected range */
export interface NodeObservation {
  blockP50: number | null;
  attestationP50: number | null;
  /** Slots the node saw a block in */
  blockSlots: number;
}

/** One node that reported in the range, joined with its timings over the range */
export interface NodeRow {
  nodeId: string;
  /**
   * The node's fct_node_active_last_24h row, or for a node only active earlier in the range the identity its
   * latest rollup row carries, without location or last seen
   */
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
  /** Median across nodes of each node's median over the range */
  network: { blockP50: number | null; attestationP50: number | null };
  /** Block rollups of every node over the range */
  block: NodeHistory | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Every node that reported in the range, with its timings over the range and whether its consensus client is
 * behind its latest release, most recently seen first.
 *
 * A node reported in the range if it has block or attestation rollup rows in it, or an active row, since the
 * last 24 hours sit inside every range. Identity comes from the active row when there is one, otherwise from the
 * node's latest rollup row.
 */
export function buildNodeRows(
  nodes: FctNodeActiveLast24h[],
  block: HistoryRow[],
  attestation: HistoryRow[],
  nowSeconds: number,
  latest: Map<string, DimClientRelease> = new Map(),
  releases: Map<string, DimClientRelease[]> = new Map()
): NodeRow[] {
  const blockSummaries = summarizeByNode(block);
  const attestationSummaries = summarizeByNode(attestation);

  const identities = new Map<string, FctNodeActiveLast24h>();
  const newestStart = new Map<string, number>();
  [...block, ...attestation].forEach(row => {
    if (!row.nodeId || !row.node || row.start < (newestStart.get(row.nodeId) ?? -Infinity)) return;
    newestStart.set(row.nodeId, row.start);
    identities.set(row.nodeId, row.node);
  });
  nodes.forEach(node => {
    if (node.node_id) identities.set(node.node_id, node);
  });

  return [...identities.entries()]
    .map(([nodeId, node]) => {
      const client = normalizeClientName(node.meta_consensus_implementation ?? '');
      const clientVersion = displayVersion(node.meta_consensus_version, releases.get(client) ?? []);
      const newest = latest.get(client)?.version;
      const outdated = !!newest && !!clientVersion && compareVersions(clientVersion, newest) < 0;
      const blockSummary = blockSummaries.get(nodeId);
      const attestationSummary = attestationSummaries.get(nodeId);
      return {
        nodeId,
        node,
        online: node.last_seen_date_time !== undefined && isNodeOnline(node.last_seen_date_time, nowSeconds),
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
    .sort(
      (a, b) =>
        (b.node.last_seen_date_time ?? newestStart.get(b.nodeId) ?? 0) -
        (a.node.last_seen_date_time ?? newestStart.get(a.nodeId) ?? 0)
    );
}

/**
 * Every node that reported in the range, with its block and attestation timings over the range.
 */
export function useNodeRows(range: NodeRange): UseNodeRowsResult {
  const active = useActiveNodes();
  const block = useNodeHistory('block', range, {});
  const attestation = useNodeHistory('attestation', range, {});
  const { latest, releases } = useLatestReleases();

  const { rows, network } = useMemo(() => {
    const rows = buildNodeRows(
      active.nodes,
      block.data?.rows ?? [],
      attestation.data?.rows ?? [],
      Date.now() / 1000,
      latest,
      releases
    );
    return {
      rows,
      network: {
        blockP50: median(rows.flatMap(row => (row.observation?.blockP50 == null ? [] : [row.observation.blockP50]))),
        attestationP50: median(
          rows.flatMap(row => (row.observation?.attestationP50 == null ? [] : [row.observation.attestationP50]))
        ),
      },
    };
  }, [active.nodes, block.data, attestation.data, latest, releases]);

  return {
    rows,
    network,
    block: block.data,
    // The node list depends on the range's rollups, so wait for them before listing nodes
    isLoading: active.isLoading || block.isLoading || attestation.isLoading,
    error: active.error,
  };
}
