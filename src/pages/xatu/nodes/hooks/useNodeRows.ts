import { useMemo } from 'react';
import type { FctNodeLastSeen } from '@/api/types.gen';
import type { NodeRange } from '@/pages/xatu/nodes/constants';
import { summarizeByNode } from '@/pages/xatu/nodes/utils/history';
import { isNodeOnline } from '@/pages/xatu/nodes/utils/node-stats';
import { useLastSeenNodes } from './useLastSeenNodes';
import { useNodeHistory, type HistoryRow, type NodeHistory } from './useNodeHistory';
import { useStableNodes } from './useStableNodes';

/** One node's typical timings over the selected range */
interface NodeObservation {
  blockP50: number | null;
  attestationP50: number | null;
  /** Slots the node saw a block in */
  blockSlots: number;
}

/** One node that reported in the range, joined with its timings over the range */
export interface NodeRow {
  nodeId: string;
  /** The Xatu node this ID belongs to: hashed IDs that rotate on restart share one */
  xatuNode: string;
  /**
   * The node's fct_node_last_seen row, or for a node missing from it the contributor and client its latest rollup
   * row carries, without location or last seen
   */
  node: FctNodeLastSeen;
  online: boolean;
  observation: NodeObservation | null;
}

export interface UseNodeRowsResult {
  rows: NodeRow[];
  /** Block rollups of every node over the range */
  block: NodeHistory | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Every node that reported in the range, with its timings over the range, most recently seen first.
 *
 * A node reported in the range if it has a fct_node_last_seen row last seen inside it, or block or attestation
 * rollup rows in it. Identity, location and last seen come from the fct_node_last_seen row.
 */
export function buildNodeRows(
  nodes: FctNodeLastSeen[],
  block: HistoryRow[],
  attestation: HistoryRow[],
  nowSeconds: number
): NodeRow[] {
  const blockSummaries = summarizeByNode(block);
  const attestationSummaries = summarizeByNode(attestation);

  const identities = new Map<string, FctNodeLastSeen>();
  const newestStart = new Map<string, number>();
  [...block, ...attestation].forEach(row => {
    if (!row.nodeId || row.start < (newestStart.get(row.nodeId) ?? -Infinity)) return;
    newestStart.set(row.nodeId, row.start);
    identities.set(row.nodeId, {
      node_id: row.nodeId,
      username: row.username,
      meta_consensus_implementation: row.client,
    });
  });
  // A node that changed its privacy setting reports under two client names; keep the one seen last
  const lastSeen = new Map<string, FctNodeLastSeen>();
  nodes.forEach(node => {
    const current = node.node_id ? lastSeen.get(node.node_id) : undefined;
    if (node.node_id && (!current || (node.last_seen_date_time ?? 0) > (current.last_seen_date_time ?? 0))) {
      lastSeen.set(node.node_id, node);
    }
  });
  lastSeen.forEach((node, nodeId) => identities.set(nodeId, node));

  return [...identities.entries()]
    .map(([nodeId, node]) => {
      const blockSummary = blockSummaries.get(nodeId);
      const attestationSummary = attestationSummaries.get(nodeId);
      return {
        nodeId,
        xatuNode: nodeId,
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
  const lastSeen = useLastSeenNodes(range);
  const block = useNodeHistory('block', range, {});
  const attestation = useNodeHistory('attestation', range, {});
  const { stable, isLoading: stableLoading } = useStableNodes();

  const rows = useMemo(
    () =>
      buildNodeRows(lastSeen.nodes, block.data?.rows ?? [], attestation.data?.rows ?? [], Date.now() / 1000).map(
        row => ({ ...row, xatuNode: stable.get(row.nodeId) ?? row.nodeId })
      ),
    [lastSeen.nodes, block.data, attestation.data, stable]
  );

  return {
    rows,
    block: block.data,
    // The node list depends on the range's rollups, so wait for them before listing nodes
    isLoading: lastSeen.isLoading || block.isLoading || attestation.isLoading || stableLoading,
    error: lastSeen.error,
  };
}
