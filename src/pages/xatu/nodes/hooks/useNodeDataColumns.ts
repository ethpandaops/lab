import { useQuery } from '@tanstack/react-query';
import { fctBlockDataColumnSidecarFirstSeenByNodeServiceList } from '@/api/sdk.gen';
import type { FctBlockDataColumnSidecarFirstSeenByNode } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { NETWORK_WINDOW_SLOTS } from '../constants';
import { median, summarize, type Summary } from '../utils/node-stats';
import { useSlotWindow, type SlotWindow } from './useSlotWindow';

/** Arrival of the columns a node saw in one slot */
export interface SlotColumns {
  first: number;
  p50: number;
  /** When the node held every column it saw */
  last: number;
  count: number;
}

export interface NodeDataColumns {
  window: SlotWindow;
  /** Median arrival and slot count per column index the node saw */
  columns: Map<number, { p50: number; slots: number }>;
  slots: Map<number, SlotColumns>;
  /** Summary of the per-slot last-column arrival */
  completionSummary: Summary | null;
}

export interface UseNodeDataColumnsResult {
  data: NodeDataColumns | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Group one node's data column sidecar rows by column index and by slot.
 */
export function buildNodeDataColumns(
  window: SlotWindow,
  rows: FctBlockDataColumnSidecarFirstSeenByNode[]
): NodeDataColumns {
  const byColumn = new Map<number, number[]>();
  const bySlot = new Map<number, Map<number, number>>();

  rows.forEach(row => {
    if (row.slot == null || row.column_index == null || row.seen_slot_start_diff == null) return;
    // Earliest arrival of each column in each slot
    if (!bySlot.has(row.slot)) bySlot.set(row.slot, new Map());
    const slotColumns = bySlot.get(row.slot)!;
    const current = slotColumns.get(row.column_index);
    if (current === undefined || row.seen_slot_start_diff < current) {
      slotColumns.set(row.column_index, row.seen_slot_start_diff);
    }
  });

  const slots = new Map<number, SlotColumns>();
  bySlot.forEach((columns, slot) => {
    const values = [...columns.values()].sort((a, b) => a - b);
    slots.set(slot, {
      first: values[0],
      p50: median(values)!,
      last: values[values.length - 1],
      count: values.length,
    });
    columns.forEach((value, column) => {
      if (!byColumn.has(column)) byColumn.set(column, []);
      byColumn.get(column)!.push(value);
    });
  });

  const columns = new Map<number, { p50: number; slots: number }>();
  byColumn.forEach((values, column) => columns.set(column, { p50: median(values)!, slots: values.length }));

  return {
    window,
    columns,
    slots,
    completionSummary: summarize([...slots.values()].map(slot => slot.last)),
  };
}

/**
 * Data column sidecar arrival for one node over the last two epochs.
 *
 * Kept to the short network window because supernodes report all 128 columns every slot.
 */
export function useNodeDataColumns(nodeId: string): UseNodeDataColumnsResult {
  const window = useSlotWindow(NETWORK_WINDOW_SLOTS);

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'node-data-columns', window?.network, nodeId, window?.startTime, window?.endTime],
    queryFn: async ({ signal }) => {
      const rows = await fetchAllPages<FctBlockDataColumnSidecarFirstSeenByNode>(
        fctBlockDataColumnSidecarFirstSeenByNodeServiceList,
        {
          query: {
            node_id_eq: nodeId,
            slot_start_date_time_gte: window!.startTime,
            slot_start_date_time_lt: window!.endTime,
            page_size: 10000,
          },
        },
        'fct_block_data_column_sidecar_first_seen_by_node',
        signal
      );
      return buildNodeDataColumns(window!, rows);
    },
    enabled: !!window && !!nodeId,
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === nodeId ? previous : undefined),
  });

  return { data: data ?? null, isLoading: isLoading || !window, error };
}
