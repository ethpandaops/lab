import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctAttestationObservationByNodeServiceList, fctBlockFirstSeenByNodeServiceList } from '@/api/sdk.gen';
import type { FctAttestationObservationByNode, FctBlockFirstSeenByNode } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { NETWORK_WINDOW_SLOTS } from '../constants';
import { median, quantile } from '../utils/node-stats';
import { useSlotWindow, type SlotWindow } from './useSlotWindow';

/** Block arrival across every node in one slot */
export interface SlotDistribution {
  slot: number;
  min: number | null;
  p10: number | null;
  p50: number | null;
  p90: number | null;
  nodeCount: number;
}

/** One node's timings over the window */
export interface NodeObservation {
  blockP50: number | null;
  attestationP50: number | null;
  /** Slots the node saw a block in */
  blockSlots: number;
}

export interface NetworkObservations {
  window: SlotWindow;
  /** Every slot in the window, oldest first */
  slots: SlotDistribution[];
  byNode: Map<string, NodeObservation>;
  /** Median block arrival per consensus client, aligned to `slots` */
  byClient: Array<{ client: string; nodeCount: number; p50: (number | null)[] }>;
  /** Median of every node's median block arrival */
  blockP50: number | null;
  /** Median of every node's median attestation arrival */
  attestationP50: number | null;
}

export interface UseNetworkObservationsResult {
  data: NetworkObservations | null;
  isLoading: boolean;
  error: Error | null;
}

/** Earliest arrival per key, keeping the fastest when a node reports a slot twice */
function setMin(map: Map<number, number>, slot: number, value: number): void {
  const current = map.get(slot);
  if (current === undefined || value < current) map.set(slot, value);
}

/**
 * Aggregate raw per-node rows into per-slot, per-node and per-client timings.
 */
export function buildNetworkObservations(
  window: SlotWindow,
  blocks: FctBlockFirstSeenByNode[],
  attestations: FctAttestationObservationByNode[]
): NetworkObservations {
  // node → slot → earliest block arrival
  const blockByNode = new Map<string, Map<number, number>>();
  const clientByNode = new Map<string, string>();
  blocks.forEach(row => {
    if (!row.node_id || row.slot == null || row.seen_slot_start_diff == null) return;
    if (!blockByNode.has(row.node_id)) blockByNode.set(row.node_id, new Map());
    setMin(blockByNode.get(row.node_id)!, row.slot, row.seen_slot_start_diff);
    clientByNode.set(row.node_id, row.meta_consensus_implementation || 'unknown');
  });

  const attestationByNode = new Map<string, number[]>();
  attestations.forEach(row => {
    if (!row.node_id || row.median_seen_slot_start_diff == null) return;
    if (!attestationByNode.has(row.node_id)) attestationByNode.set(row.node_id, []);
    attestationByNode.get(row.node_id)!.push(row.median_seen_slot_start_diff);
  });

  // slot → arrivals of every node; client → slot → arrivals
  const slotArrivals = new Map<number, number[]>();
  const clientSlotArrivals = new Map<string, Map<number, number[]>>();
  const clientNodes = new Map<string, number>();
  blockByNode.forEach((bySlot, nodeId) => {
    const client = clientByNode.get(nodeId) ?? 'unknown';
    clientNodes.set(client, (clientNodes.get(client) ?? 0) + 1);
    if (!clientSlotArrivals.has(client)) clientSlotArrivals.set(client, new Map());
    const clientSlots = clientSlotArrivals.get(client)!;
    bySlot.forEach((value, slot) => {
      if (!slotArrivals.has(slot)) slotArrivals.set(slot, []);
      slotArrivals.get(slot)!.push(value);
      if (!clientSlots.has(slot)) clientSlots.set(slot, []);
      clientSlots.get(slot)!.push(value);
    });
  });

  const slotNumbers: number[] = [];
  for (let slot = window.startSlot; slot < window.endSlot; slot++) slotNumbers.push(slot);

  const slots = slotNumbers.map(slot => {
    const values = (slotArrivals.get(slot) ?? []).sort((a, b) => a - b);
    if (values.length === 0) return { slot, min: null, p10: null, p50: null, p90: null, nodeCount: 0 };
    return {
      slot,
      min: values[0],
      p10: quantile(values, 0.1),
      p50: quantile(values, 0.5),
      p90: quantile(values, 0.9),
      nodeCount: values.length,
    };
  });

  const byNode = new Map<string, NodeObservation>();
  new Set([...blockByNode.keys(), ...attestationByNode.keys()]).forEach(nodeId => {
    const bySlot = blockByNode.get(nodeId);
    byNode.set(nodeId, {
      blockP50: bySlot ? median([...bySlot.values()]) : null,
      attestationP50: median(attestationByNode.get(nodeId) ?? []),
      blockSlots: bySlot?.size ?? 0,
    });
  });

  const byClient = [...clientSlotArrivals.entries()]
    .map(([client, bySlot]) => ({
      client,
      nodeCount: clientNodes.get(client) ?? 0,
      p50: slotNumbers.map(slot => median(bySlot.get(slot) ?? [])),
    }))
    .sort((a, b) => b.nodeCount - a.nodeCount);

  const nodeValues = [...byNode.values()];
  return {
    window,
    slots,
    byNode,
    byClient,
    blockP50: median(nodeValues.flatMap(node => (node.blockP50 === null ? [] : [node.blockP50]))),
    attestationP50: median(nodeValues.flatMap(node => (node.attestationP50 === null ? [] : [node.attestationP50]))),
  };
}

/**
 * Block and attestation arrival for every node over the last two epochs.
 *
 * The overview and each node page read the same window, so a node can be ranked against the network.
 */
export function useNetworkObservations(): UseNetworkObservationsResult {
  const window = useSlotWindow(NETWORK_WINDOW_SLOTS);

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'network-observations', window?.network, window?.startTime, window?.endTime],
    queryFn: async ({ signal }) => {
      const query = {
        slot_start_date_time_gte: window!.startTime,
        slot_start_date_time_lt: window!.endTime,
        page_size: 10000,
      };
      const [blocks, attestations] = await Promise.all([
        fetchAllPages<FctBlockFirstSeenByNode>(
          fctBlockFirstSeenByNodeServiceList,
          { query },
          'fct_block_first_seen_by_node',
          signal
        ),
        fetchAllPages<FctAttestationObservationByNode>(
          fctAttestationObservationByNodeServiceList,
          { query },
          'fct_attestation_observation_by_node',
          signal
        ),
      ]);
      return buildNetworkObservations(window!, blocks, attestations);
    },
    enabled: !!window,
    placeholderData: keepPreviousData,
  });

  return { data: data ?? null, isLoading: isLoading || !window, error };
}
