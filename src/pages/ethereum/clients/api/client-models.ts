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

/* P2P census and ENR crawl, xatu-cbt#342. Daily; each peer counted once per day with its latest agent. */

/** Consensus peers per client version */
export interface FctPeerCountByClClientDaily {
  day_start_date?: string;
  client?: string;
  version?: string;
  release_status?: string;
  peer_count?: number;
  dialled_peer_count?: number;
  quic_connected_peer_count?: number;
  quic_listen_peer_count?: number;
  custody_known_peer_count?: number;
  custody_4_peer_count?: number;
  custody_5_8_peer_count?: number;
  custody_9_127_peer_count?: number;
  custody_128_peer_count?: number;
  latency_p50_ms?: number | null;
  latency_p90_ms?: number | null;
  connection_age_p50_ms?: number | null;
}

/** Execution peers per client version */
export interface FctPeerCountByElClientDaily {
  day_start_date?: string;
  client?: string;
  version?: string;
  release_status?: string;
  peer_count?: number;
}

/** Peers per client and country; small countries roll into other */
export interface FctPeerCountByClientCountryDaily {
  day_start_date?: string;
  client?: string;
  continent_code?: string;
  country_code?: string;
  country?: string;
  peer_count?: number;
}

/** Peers per client and network; small networks roll into other */
export interface FctPeerCountByClientAsnDaily {
  day_start_date?: string;
  client?: string;
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
  /** hosting, from a curated list of hosting networks, or other */
  network_type?: string;
  peer_count?: number;
}

/** Consensus peers per client supporting each protocol */
export interface FctPeerProtocolByClClientDaily {
  day_start_date?: string;
  client?: string;
  protocol?: string;
  peer_count?: number;
  /** All of the client's peers that day */
  client_peer_count?: number;
}

/** IPv4 addresses running exactly one consensus and one execution client, with the day's totals on every row */
export interface FctPeerCountByClientPairDaily {
  day_start_date?: string;
  consensus_client?: string;
  execution_client?: string;
  ip_count?: number;
  cl_ip_count?: number;
  el_ip_count?: number;
  matched_ip_count?: number;
  paired_ip_count?: number;
}

/** Consensus ENRs per client version and the fork digests they advertise */
export interface FctPeerForkReadinessByClClientDaily {
  day_start_date?: string;
  client?: string;
  version?: string;
  release_status?: string;
  fork_digest?: string;
  /** Empty when no fork is scheduled */
  next_fork_digest?: string;
  node_count?: number;
}

/** Execution ENRs per client version and the fork id they advertise */
export interface FctPeerForkReadinessByElClientDaily {
  day_start_date?: string;
  client?: string;
  version?: string;
  release_status?: string;
  fork_id_hash?: string;
  /** Next fork's timestamp or block, empty when none */
  fork_id_next?: string;
  node_count?: number;
}

/** Custody probes of peers per client version */
export interface FctCustodyProbeByClientDaily {
  day_start_date?: string;
  client?: string;
  version?: string;
  release_status?: string;
  peer_count?: number;
  probe_count?: number;
  success_count?: number;
  missing_count?: number;
  failure_count?: number;
  missing_peer_count?: number;
  response_time_p50_ms?: number | null;
  response_time_p90_ms?: number | null;
}

export const CENSUS_TABLES = {
  clPeers: 'fct_peer_count_by_cl_client_daily',
  clCountry: 'fct_peer_count_by_cl_client_country_daily',
  clAsn: 'fct_peer_count_by_cl_client_asn_daily',
  clProtocol: 'fct_peer_protocol_by_cl_client_daily',
  elPeers: 'fct_peer_count_by_el_client_daily',
  elCountry: 'fct_peer_count_by_el_client_country_daily',
  elAsn: 'fct_peer_count_by_el_client_asn_daily',
  pairs: 'fct_peer_count_by_client_pair_daily',
  clReadiness: 'fct_peer_fork_readiness_by_cl_client_daily',
  elReadiness: 'fct_peer_fork_readiness_by_el_client_daily',
  custody: 'fct_custody_probe_by_client_daily',
} as const;

export type CensusTable = (typeof CENSUS_TABLES)[keyof typeof CENSUS_TABLES];

/** List call for a census table */
export function censusList(table: CensusTable): (params: ListParams) => Promise<{ data: unknown }> {
  return list(table);
}
