import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctAttestationCorrectnessByValidatorCanonicalServiceListOptions,
  fctAttestationCorrectnessCanonicalServiceListOptions,
  fctAttestationVoteCorrectnessByValidatorServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctAttestationVoteCorrectnessByValidatorServiceListData } from '@/api/types.gen';

export type AttestationOutcome = 'all' | 'missed' | 'head' | 'target' | 'source' | 'late';

export interface AttestationDuty {
  slot: number;
  timestamp: number;
  validatorIndex: number;
  attested: boolean;
  headCorrect: boolean | null;
  targetCorrect: boolean | null;
  sourceCorrect: boolean | null;
  inclusionDistance: number | null;
  /** Block root the validator voted for as head */
  votedRoot: string | null;
  /** Canonical block root at the slot */
  canonicalRoot: string | null;
  /** Committee votes for the canonical root, and the committee size */
  votesHead: number | null;
  votesMax: number | null;
}

type DutyQuery = NonNullable<FctAttestationVoteCorrectnessByValidatorServiceListData['query']>;

const OUTCOME_FILTERS: Record<AttestationOutcome, Partial<DutyQuery>> = {
  all: {},
  missed: { attested_eq: false },
  head: { head_correct_eq: false },
  target: { target_correct_eq: false },
  source: { source_correct_eq: false },
  late: { inclusion_distance_gt: 1 },
};

/**
 * One page of attestation duties for a set of validators, newest first, with each duty's head vote
 * and how the rest of the committee voted at that slot.
 */
export function useAttestationDuties({
  indices,
  from,
  to,
  outcome,
  slot,
  pageSize,
  pageToken,
}: {
  indices: number[];
  /** Range start and end day (unix seconds, start of day UTC); the end day is included */
  from: number;
  to: number;
  outcome: AttestationOutcome;
  slot: number | null;
  pageSize: number;
  pageToken: string | undefined;
}): {
  duties: AttestationDuty[];
  nextPageToken: string | undefined;
  isLoading: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
} {
  const duties = useQuery({
    ...fctAttestationVoteCorrectnessByValidatorServiceListOptions({
      query: {
        validator_index_in_values: indices.join(','),
        slot_start_date_time_gte: from,
        slot_start_date_time_lte: to + 86_400,
        order_by: 'slot DESC, validator_index ASC',
        page_size: pageSize,
        page_token: pageToken,
        ...(slot !== null && { slot_eq: slot }),
        ...OUTCOME_FILTERS[outcome],
      },
    }),
    enabled: indices.length > 0,
    placeholderData: keepPreviousData,
  });

  const rows = duties.data?.fct_attestation_vote_correctness_by_validator ?? [];
  const times = [...new Set(rows.map(r => r.slot_start_date_time ?? 0))].join(',');
  const voters = [...new Set(rows.map(r => r.validator_index ?? 0))].join(',');

  const votes = useQuery({
    ...fctAttestationCorrectnessByValidatorCanonicalServiceListOptions({
      query: {
        attesting_validator_index_in_values: voters,
        slot_start_date_time_in_values: times,
        page_size: 10_000,
      },
    }),
    enabled: rows.length > 0,
  });

  const network = useQuery({
    ...fctAttestationCorrectnessCanonicalServiceListOptions({
      query: { slot_start_date_time_in_values: times, page_size: 10_000 },
    }),
    enabled: rows.length > 0,
  });

  const votedRoot = new Map(
    votes.data?.fct_attestation_correctness_by_validator_canonical?.map(v => [
      `${v.attesting_validator_index}:${v.slot}`,
      v.block_root ?? null,
    ])
  );
  const networkBySlot = new Map(network.data?.fct_attestation_correctness_canonical?.map(n => [n.slot, n]));

  return {
    duties: rows.map(r => {
      const n = networkBySlot.get(r.slot);
      return {
        slot: r.slot ?? 0,
        timestamp: r.slot_start_date_time ?? 0,
        validatorIndex: r.validator_index ?? 0,
        attested: r.attested ?? false,
        headCorrect: r.head_correct ?? null,
        targetCorrect: r.target_correct ?? null,
        sourceCorrect: r.source_correct ?? null,
        inclusionDistance: r.inclusion_distance ?? null,
        votedRoot: votedRoot.get(`${r.validator_index}:${r.slot}`) ?? null,
        canonicalRoot: n?.block_root ?? null,
        votesHead: n?.votes_head ?? null,
        votesMax: n?.votes_max ?? null,
      };
    }),
    nextPageToken: duties.data?.next_page_token || undefined,
    isLoading: duties.isLoading,
    isPlaceholderData: duties.isPlaceholderData,
    error: (duties.error ?? votes.error ?? network.error ?? null) as Error | null,
  };
}
