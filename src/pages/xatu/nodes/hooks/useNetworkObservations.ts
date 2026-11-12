import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctBlockFirstSeenByNodeServiceList } from '@/api/sdk.gen';
import type { FctBlockFirstSeenByNode } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { NETWORK_WINDOW_SLOTS } from '@/pages/xatu/nodes/constants';
import { quantile } from '@/pages/xatu/nodes/utils/node-stats';
import { useSlotWindow, type SlotWindow } from './useSlotWindow';

/** Block arrival across every node in one slot */
interface SlotDistribution {
  slot: number;
  min: number | null;
  p10: number | null;
  p50: number | null;
  p90: number | null;
  nodeCount: number;
}

interface NetworkObservations {
  window: SlotWindow;
  /** Every slot in the window, oldest first */
  slots: SlotDistribution[];
}

export interface UseNetworkObservationsResult {
  data: NetworkObservations | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Block arrival per slot across every node, from per-node rows. A node that reports a slot twice counts once, with
 * its earliest arrival.
 */
function buildNetworkObservations(window: SlotWindow, blocks: FctBlockFirstSeenByNode[]): NetworkObservations {
  // slot → node → earliest block arrival
  const bySlot = new Map<number, Map<string, number>>();
  blocks.forEach(row => {
    if (!row.node_id || row.slot == null || row.seen_slot_start_diff == null) return;
    if (!bySlot.has(row.slot)) bySlot.set(row.slot, new Map());
    const nodes = bySlot.get(row.slot)!;
    const current = nodes.get(row.node_id);
    if (current === undefined || row.seen_slot_start_diff < current) nodes.set(row.node_id, row.seen_slot_start_diff);
  });

  const slots: SlotDistribution[] = [];
  for (let slot = window.startSlot; slot < window.endSlot; slot++) {
    const values = [...(bySlot.get(slot)?.values() ?? [])].sort((a, b) => a - b);
    const min = values[0];
    slots.push(
      min === undefined
        ? { slot, min: null, p10: null, p50: null, p90: null, nodeCount: 0 }
        : {
            slot,
            min,
            p10: quantile(values, 0.1),
            p50: quantile(values, 0.5),
            p90: quantile(values, 0.9),
            nodeCount: values.length,
          }
    );
  }
  return { window, slots };
}

/**
 * Block arrival per slot across every node over the recent slot window, to place one node against the network.
 */
export function useNetworkObservations(): UseNetworkObservationsResult {
  const window = useSlotWindow(NETWORK_WINDOW_SLOTS);

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'network-observations', window?.network, window?.startTime, window?.endTime],
    queryFn: async ({ signal }) => {
      const blocks = await fetchAllPages<FctBlockFirstSeenByNode>(
        fctBlockFirstSeenByNodeServiceList,
        {
          query: {
            slot_start_date_time_gte: window!.startTime,
            slot_start_date_time_lt: window!.endTime,
            page_size: 10000,
          },
        },
        'fct_block_first_seen_by_node',
        signal
      );
      return buildNetworkObservations(window!, blocks);
    },
    enabled: !!window,
    placeholderData: keepPreviousData,
  });

  return { data: data ?? null, isLoading: isLoading || !window, error };
}
