import type { FctBlockFastConfirmationByClientDaily, FctBlockFastConfirmationByNode } from '@/api/types.gen';
import type { BlockObservation } from './fast-confirmation.utils';

/** One client's daily aggregate, with the fields the page uses */
export interface ClientDay {
  day: string;
  client: string;
  slots: number;
  observations: number;
  direct: number;
  orphaned: number;
  unconfirmed: number;
  p50FastMs: number;
  p99FastMs: number;
  maxFastMs: number;
  p50FinalityMs: number;
}

/**
 * Map a fct_block_fast_confirmation_by_node row onto a BlockObservation.
 */
export function toObservation(row: FctBlockFastConfirmationByNode): BlockObservation {
  return {
    slot: row.slot ?? 0,
    slotStartDateTime: row.slot_start_date_time ?? 0,
    blockRoot: row.block_root ?? '',
    status: row.status ?? '',
    client: row.meta_consensus_implementation ?? '',
    node: row.meta_client_name ?? '',
    confirmationType: row.confirmation_type ?? '',
    fastConfirmedMs: row.fast_confirmed_slot_start_diff ?? null,
    confirmationSlot: row.fast_confirmation_slot ?? null,
    finalizedMs: row.finalized_slot_start_diff ?? null,
  };
}

/**
 * Map a fct_block_fast_confirmation_by_client_daily row onto a ClientDay.
 */
export function toClientDay(row: FctBlockFastConfirmationByClientDaily): ClientDay {
  return {
    day: row.day_start_date ?? '',
    client: row.meta_consensus_implementation ?? '',
    slots: row.slot_count ?? 0,
    observations: row.observation_count ?? 0,
    direct: row.direct_count ?? 0,
    orphaned: row.orphaned_count ?? 0,
    unconfirmed: row.unconfirmed_count ?? 0,
    p50FastMs: row.p50_fast_confirmation_ms ?? 0,
    p99FastMs: row.p99_fast_confirmation_ms ?? 0,
    maxFastMs: row.max_fast_confirmation_ms ?? 0,
    p50FinalityMs: row.p50_finality_ms ?? 0,
  };
}
