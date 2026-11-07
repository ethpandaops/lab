/** A slot without a canonical block before orphaned blocks were observed: it may have been missed or orphaned */
export const MISSED_OR_ORPHANED = 'missed or orphaned';

export type ProposalStatus = 'canonical' | 'orphaned' | 'missed' | typeof MISSED_OR_ORPHANED;

/**
 * A proposal's status as far as it is known. Orphaned blocks are only seen from `orphansKnownFrom` (unix seconds,
 * the first slot of fct_block_proposer_head); before it, or when that start is unknown, a slot without a canonical
 * block counts as missed in the data but may as well have been orphaned.
 */
export function proposalStatus(
  status: string | undefined,
  slotTime: number,
  orphansKnownFrom: number | undefined
): ProposalStatus {
  if (status === 'canonical' || status === 'orphaned') return status;
  return orphansKnownFrom !== undefined && slotTime >= orphansKnownFrom ? 'missed' : MISSED_OR_ORPHANED;
}
