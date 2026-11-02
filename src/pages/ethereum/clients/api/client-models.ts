/**
 * Types and list calls for the xatu-cbt client models added in xatu-cbt#340 (migration 131).
 *
 * The generated client in `src/api` does not have them until it is regenerated against an API that serves them.
 * Once it is, replace these with the generated types and `*ServiceList` functions and delete this file.
 */
import { client } from '@/api/client.gen';

/** How a graffiti resolved to a release */
export type ReleaseStatus =
  /** A tagged commit */
  | 'commit_match'
  /** A branch commit, counted under the release it builds on */
  | 'commit_untagged'
  /** A version string without a commit */
  | 'version_match'
  | 'no_commit'
  | 'commit_zero'
  | 'codes_min'
  | 'commit_short'
  | 'commit_unmatched'
  | 'commit_ambiguous'
  | 'version_unmatched'
  | 'none';

/** Statuses whose version names a release */
export const RESOLVED_STATUSES: ReadonlySet<string> = new Set(['commit_match', 'commit_untagged', 'version_match']);

interface VersionCountFields {
  /** consensus or execution */
  layer?: string;
  client?: string;
  /** Release version, empty when unresolved */
  version?: string;
  commit_prefix?: string;
  release_status?: string;
  block_count?: number;
  updated_date_time?: number;
}

export type FctBlockGraffitiClientVersionDaily = VersionCountFields & { day_start_date?: string };
export type FctBlockGraffitiClientVersionByEntityDaily = FctBlockGraffitiClientVersionDaily & { entity?: string };
export type FctBlockGraffitiClientVersionHourly = VersionCountFields & { hour_start_date_time?: number };
export type FctBlockGraffitiClientVersionByEntityHourly = FctBlockGraffitiClientVersionHourly & { entity?: string };

/** One canonical block with both layers' clients resolved to releases */
export interface IntBlockGraffitiRelease {
  slot?: number;
  slot_start_date_time?: number;
  block_root?: string;
  proposer_index?: number;
  entity?: string;
  graffiti_format?: string;
  consensus_client?: string;
  consensus_client_version?: string;
  consensus_client_commit?: string;
  consensus_client_release_status?: string;
  execution_client?: string;
  execution_client_version?: string;
  execution_client_commit?: string;
  execution_client_release_status?: string;
}

/** A commit on a client's default or release branches, with the release it builds on */
export interface DimClientCommit {
  client?: string;
  layer?: string;
  repository?: string;
  commit_sha?: string;
  commit_date?: number;
  base_tag?: string;
  base_version?: string;
  /** 0 for a tagged commit */
  commits_since_base?: number;
  is_tagged?: boolean;
}

/** Blocks proposed with a client per day, and how they fared */
export interface FctBlockProposalByClientDaily {
  day_start_date?: string;
  layer?: string;
  client?: string;
  block_count?: number;
  mev_block_count?: number;
  avg_mev_value_eth?: number | null;
  avg_gas_used?: number | null;
  avg_blob_count?: number | null;
  blob_count?: number;
  block_first_seen_p50_ms?: number | null;
  block_first_seen_p90_ms?: number | null;
  orphaned_block_count?: number;
  missed_slot_count?: number;
}

/** Attestation duties of validators per client per day */
export interface FctAttestationVoteCorrectnessByClientDaily {
  day_start_date?: string;
  layer?: string;
  client?: string;
  validator_count?: number;
  total_duties?: number;
  attested_count?: number;
  missed_count?: number;
  head_correct_count?: number;
  target_correct_count?: number;
  source_correct_count?: number;
  avg_inclusion_distance?: number | null;
}

type ListParams = { query?: Record<string, unknown>; signal?: AbortSignal; throwOnError?: boolean };

/** A list call in the shape `fetchAllPages` takes */
function list(table: string) {
  return (params: ListParams): Promise<{ data: unknown }> =>
    client.get({ url: `/api/v1/${table}`, query: params.query, signal: params.signal, throwOnError: true }) as Promise<{
      data: unknown;
    }>;
}

export const fctBlockGraffitiClientVersionDailyList = list('fct_block_graffiti_client_version_daily');
export const fctBlockGraffitiClientVersionByEntityDailyList = list('fct_block_graffiti_client_version_by_entity_daily');
export const fctBlockGraffitiClientVersionHourlyList = list('fct_block_graffiti_client_version_hourly');
export const intBlockGraffitiReleaseList = list('int_block_graffiti_release');
export const dimClientCommitList = list('dim_client_commit');
export const fctBlockProposalByClientDailyList = list('fct_block_proposal_by_client_daily');
export const fctAttestationVoteCorrectnessByClientDailyList = list('fct_attestation_vote_correctness_by_client_daily');
