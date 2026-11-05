/**
 * Per-entity performance tables (xatu-cbt#346) and their entity-group grain (xatu-cbt#361), called by path until the
 * generated client serves them.
 */
import { client as apiClient } from '@/api/client.gen';
import type { fetchAllPages } from '@/utils/api-pagination';
import type { AttestationColumns, ProposalColumns } from '../utils/performance';

type ListFn = Parameters<typeof fetchAllPages>[0];

/** A list call by table path, in the shape `fetchAllPages` takes */
function listByPath(table: string): ListFn {
  return params =>
    apiClient.get({
      url: `/api/v1/${table}`,
      query: params.query,
      signal: params.signal,
      throwOnError: true,
    }) as Promise<{ data: unknown }>;
}

export const ENTITY_TABLES = {
  rolling: 'fct_validator_performance_by_entity_rolling',
  attestationsDaily: 'fct_attestation_vote_correctness_by_entity_daily',
  proposalsDaily: 'fct_block_proposal_by_entity_daily',
  proposers: 'fct_block_proposer_by_entity',
  groupStake: 'fct_validator_stake_by_entity_group_daily',
  groupAttestations: 'fct_attestation_vote_correctness_by_entity_group_daily',
  groupProposals: 'fct_block_proposal_by_entity_group_daily',
} as const;

export interface FctValidatorPerformanceByEntityRolling extends AttestationColumns, ProposalColumns {
  period?: string;
  entity?: string;
  period_start_date_time?: number;
  period_end_date_time?: number;
}

export interface FctAttestationVoteCorrectnessByEntityDaily extends AttestationColumns {
  day_start_date?: string;
  entity?: string;
  validator_count?: number;
}

export interface FctBlockProposalByEntityDaily extends ProposalColumns {
  day_start_date?: string;
  entity?: string;
}

export interface FctBlockProposerByEntity {
  slot?: number;
  slot_start_date_time?: number;
  entity?: string;
  proposer_validator_index?: number;
  status?: string;
}

export const fctValidatorPerformanceByEntityRollingList = listByPath(ENTITY_TABLES.rolling);
export const fctAttestationVoteCorrectnessByEntityDailyList = listByPath(ENTITY_TABLES.attestationsDaily);
export const fctBlockProposalByEntityDailyList = listByPath(ENTITY_TABLES.proposalsDaily);
export const fctBlockProposerByEntityList = listByPath(ENTITY_TABLES.proposers);

export interface FctValidatorStakeByEntityGroupDaily {
  day_start_date?: string;
  entity_group?: string;
  credential_type?: string;
  entity_count?: number;
  active_validator_count?: number;
  active_effective_balance?: number;
}

export interface FctAttestationVoteCorrectnessByEntityGroupDaily extends AttestationColumns {
  day_start_date?: string;
  entity_group?: string;
}

export interface FctBlockProposalByEntityGroupDaily extends ProposalColumns {
  day_start_date?: string;
  entity_group?: string;
}

export const fctValidatorStakeByEntityGroupDailyList = listByPath(ENTITY_TABLES.groupStake);
export const fctAttestationVoteCorrectnessByEntityGroupDailyList = listByPath(ENTITY_TABLES.groupAttestations);
export const fctBlockProposalByEntityGroupDailyList = listByPath(ENTITY_TABLES.groupProposals);
