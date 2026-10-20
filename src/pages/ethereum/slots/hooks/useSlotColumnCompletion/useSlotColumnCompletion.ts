import { useQuery } from '@tanstack/react-query';
import {
  fctBlockDataColumnCompletionServiceListOptions,
  fctBlockPartialDataColumnHeaderFirstSeenServiceListOptions,
  fctDataColumnCompletionBySlotServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockDataColumnCompletion,
  FctBlockPartialDataColumnHeaderFirstSeen,
  FctDataColumnCompletionBySlot,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';

export interface SlotColumnCompletion {
  /** Completions summed over the block's columns, undefined when no sentry completed one */
  block?: FctBlockDataColumnCompletion;
  /** One row per column, by column index */
  columns: FctDataColumnCompletionBySlot[];
  /** First sighting of the block's partial column header, Fulu blocks only */
  header?: FctBlockPartialDataColumnHeaderFirstSeen;
  isLoading: boolean;
}

/**
 * How sentry nodes completed the data columns of the block in a slot, with the per column breakdown.
 */
export function useSlotColumnCompletion(slot: number): SlotColumnCompletion {
  const { currentNetwork } = useNetwork();
  const slotStart = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const enabled = !!currentNetwork && slotStart > 0;

  const block = useQuery({
    ...fctBlockDataColumnCompletionServiceListOptions({
      query: { slot_start_date_time_eq: slotStart, page_size: 10 },
    }),
    enabled,
  });
  const columns = useQuery({
    ...fctDataColumnCompletionBySlotServiceListOptions({
      query: { slot_start_date_time_eq: slotStart, order_by: 'column_index asc', page_size: 1000 },
    }),
    enabled,
  });
  const header = useQuery({
    ...fctBlockPartialDataColumnHeaderFirstSeenServiceListOptions({
      query: { slot_start_date_time_eq: slotStart, page_size: 10 },
    }),
    enabled,
  });

  const blockRow = block.data?.fct_block_data_column_completion?.[0];
  const root = blockRow?.block_root;
  return {
    block: blockRow,
    columns: (columns.data?.fct_data_column_completion_by_slot ?? []).filter(row => !root || row.block_root === root),
    header: header.data?.fct_block_partial_data_column_header_first_seen?.find(row => !root || row.block_root === root),
    isLoading: block.isLoading || columns.isLoading,
  };
}
