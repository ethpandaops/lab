import { useQuery } from '@tanstack/react-query';
import {
  fctAttestationObservationByNodeServiceList,
  fctBlockFirstSeenByNodeServiceList,
  fctHeadFirstSeenByNodeServiceList,
} from '@/api/sdk.gen';
import type { FctAttestationObservationByNode, FctBlockFirstSeenByNode, FctHeadFirstSeenByNode } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { summarize, type Summary } from '../utils/node-stats';
import { useSlotWindow, type SlotWindow } from './useSlotWindow';

/** Attestation arrival a node saw in one slot */
export interface SlotAttestations {
  p50: number;
  count: number;
}

export interface NodePerformance {
  window: SlotWindow;
  /** Earliest block arrival (ms from slot start) by slot */
  block: Map<number, number>;
  /** Earliest head event (ms from slot start) by slot */
  head: Map<number, number>;
  attestations: Map<number, SlotAttestations>;
  blockSummary: Summary | null;
  headSummary: Summary | null;
  /** Summary of the per-slot attestation medians */
  attestationSummary: Summary | null;
}

export interface UseNodePerformanceResult {
  data: NodePerformance | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

function earliestBySlot(rows: Array<FctBlockFirstSeenByNode | FctHeadFirstSeenByNode>): Map<number, number> {
  const bySlot = new Map<number, number>();
  rows.forEach(row => {
    if (row.slot == null || row.seen_slot_start_diff == null) return;
    const current = bySlot.get(row.slot);
    if (current === undefined || row.seen_slot_start_diff < current) bySlot.set(row.slot, row.seen_slot_start_diff);
  });
  return bySlot;
}

/**
 * Aggregate one node's block, head and attestation rows by slot.
 */
export function buildNodePerformance(
  window: SlotWindow,
  blocks: FctBlockFirstSeenByNode[],
  heads: FctHeadFirstSeenByNode[],
  attestationRows: FctAttestationObservationByNode[]
): NodePerformance {
  const block = earliestBySlot(blocks);
  const head = earliestBySlot(heads);

  const attestations = new Map<number, SlotAttestations>();
  attestationRows.forEach(row => {
    if (row.slot == null || row.median_seen_slot_start_diff == null) return;
    const count = row.attestation_count ?? 0;
    const existing = attestations.get(row.slot);
    // A slot can have rows per voted block root; keep the one carrying most attestations
    if (existing && existing.count >= count) return;
    attestations.set(row.slot, {
      p50: row.median_seen_slot_start_diff,
      count,
    });
  });

  return {
    window,
    block,
    head,
    attestations,
    blockSummary: summarize([...block.values()]),
    headSummary: summarize([...head.values()]),
    attestationSummary: summarize([...attestations.values()].map(entry => entry.p50)),
  };
}

/**
 * Block, head and attestation arrival for one node, slot by slot, over the last `slots` slots.
 */
export function useNodePerformance(nodeId: string, slots: number): UseNodePerformanceResult {
  const window = useSlotWindow(slots);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['xatu-nodes', 'node-performance', window?.network, nodeId, window?.startTime, window?.endTime],
    queryFn: async ({ signal }) => {
      const query = {
        node_id_eq: nodeId,
        slot_start_date_time_gte: window!.startTime,
        slot_start_date_time_lt: window!.endTime,
        page_size: 10000,
      };
      const [blocks, heads, attestations] = await Promise.all([
        fetchAllPages<FctBlockFirstSeenByNode>(
          fctBlockFirstSeenByNodeServiceList,
          { query },
          'fct_block_first_seen_by_node',
          signal
        ),
        fetchAllPages<FctHeadFirstSeenByNode>(
          fctHeadFirstSeenByNodeServiceList,
          { query },
          'fct_head_first_seen_by_node',
          signal
        ),
        fetchAllPages<FctAttestationObservationByNode>(
          fctAttestationObservationByNodeServiceList,
          { query },
          'fct_attestation_observation_by_node',
          signal
        ),
      ]);
      return buildNodePerformance(window!, blocks, heads, attestations);
    },
    enabled: !!window && !!nodeId,
    // Keep showing the previous window of the same node while the next one loads
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === nodeId ? previous : undefined),
  });

  return { data: data ?? null, isLoading: isLoading || !window, isFetching, error };
}
