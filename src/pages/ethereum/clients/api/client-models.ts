/**
 * Release statuses and census table names for the xatu-cbt client models (xatu-cbt#340 and #342).
 */
import {
  dimClientCommitServiceList,
  fctAttestationVoteCorrectnessByClientDailyServiceList,
  fctBlockGraffitiClientVersionByEntityDailyServiceList,
  fctBlockGraffitiClientVersionByEntityHourlyServiceList,
  fctBlockGraffitiClientVersionDailyServiceList,
  fctBlockGraffitiClientVersionHourlyServiceList,
  fctBlockProposalByClientDailyServiceList,
  fctCustodyProbeByClientDailyServiceList,
  fctPeerCountByClClientAsnDailyServiceList,
  fctPeerCountByClClientCountryDailyServiceList,
  fctPeerCountByClClientDailyServiceList,
  fctPeerCountByClientPairDailyServiceList,
  fctPeerCountByElClientAsnDailyServiceList,
  fctPeerCountByElClientCountryDailyServiceList,
  fctPeerCountByElClientDailyServiceList,
  fctPeerForkReadinessByClClientDailyServiceList,
  fctPeerForkReadinessByElClientDailyServiceList,
  fctPeerProtocolByClClientDailyServiceList,
  intBlockGraffitiReleaseServiceList,
} from '@/api/sdk.gen';
import type { FctPeerCountByClClientAsnDaily, FctPeerCountByClClientCountryDaily } from '@/api/types.gen';
import type { fetchAllPages } from '@/utils/api-pagination';

/** How a graffiti resolved to a release */
export type ReleaseStatus =
  /** A tagged commit */
  | 'commit_match'
  /** A branch commit, counted under the release it builds on */
  | 'commit_untagged'
  /** The commit resolves to another release than the graffiti states; version is the commit's release */
  | 'commit_mismatch'
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
export const RESOLVED_STATUSES: ReadonlySet<string> = new Set([
  'commit_match',
  'commit_untagged',
  'commit_mismatch',
  'version_match',
]);

/** Statuses whose version, when there is one, is only what the graffiti or agent states */
export const UNRESOLVED_STATUSES: readonly string[] = [
  'no_commit',
  'commit_zero',
  'codes_min',
  'commit_short',
  'commit_unmatched',
  'commit_ambiguous',
  'version_unmatched',
  'none',
];

export type {
  DimClientCommit,
  FctAttestationVoteCorrectnessByClientDaily,
  FctBlockGraffitiClientVersionByEntityDaily,
  FctBlockGraffitiClientVersionByEntityHourly,
  FctBlockGraffitiClientVersionDaily,
  FctBlockGraffitiClientVersionHourly,
  FctBlockProposalByClientDaily,
  FctCustodyProbeByClientDaily,
  FctPeerCountByClClientDaily,
  FctPeerCountByClientPairDaily,
  FctPeerCountByElClientDaily,
  FctPeerForkReadinessByClClientDaily,
  FctPeerForkReadinessByElClientDaily,
  FctPeerProtocolByClClientDaily,
  IntBlockGraffitiRelease,
} from '@/api/types.gen';

/** Peers per client and country; the consensus and execution tables share a shape */
export type FctPeerCountByClientCountryDaily = FctPeerCountByClClientCountryDaily;
/** Peers per client and network; the consensus and execution tables share a shape */
export type FctPeerCountByClientAsnDaily = FctPeerCountByClClientAsnDaily;

type ListFn = Parameters<typeof fetchAllPages>[0];

export const fctBlockGraffitiClientVersionDailyList = fctBlockGraffitiClientVersionDailyServiceList as ListFn;
export const fctBlockGraffitiClientVersionByEntityDailyList =
  fctBlockGraffitiClientVersionByEntityDailyServiceList as ListFn;
export const fctBlockGraffitiClientVersionHourlyList = fctBlockGraffitiClientVersionHourlyServiceList as ListFn;
export const fctBlockGraffitiClientVersionByEntityHourlyList =
  fctBlockGraffitiClientVersionByEntityHourlyServiceList as ListFn;
export const intBlockGraffitiReleaseList = intBlockGraffitiReleaseServiceList as ListFn;
export const dimClientCommitList = dimClientCommitServiceList as ListFn;
export const fctBlockProposalByClientDailyList = fctBlockProposalByClientDailyServiceList as ListFn;
export const fctAttestationVoteCorrectnessByClientDailyList =
  fctAttestationVoteCorrectnessByClientDailyServiceList as ListFn;

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

const CENSUS_LISTS: Record<CensusTable, unknown> = {
  fct_peer_count_by_cl_client_daily: fctPeerCountByClClientDailyServiceList,
  fct_peer_count_by_cl_client_country_daily: fctPeerCountByClClientCountryDailyServiceList,
  fct_peer_count_by_cl_client_asn_daily: fctPeerCountByClClientAsnDailyServiceList,
  fct_peer_protocol_by_cl_client_daily: fctPeerProtocolByClClientDailyServiceList,
  fct_peer_count_by_el_client_daily: fctPeerCountByElClientDailyServiceList,
  fct_peer_count_by_el_client_country_daily: fctPeerCountByElClientCountryDailyServiceList,
  fct_peer_count_by_el_client_asn_daily: fctPeerCountByElClientAsnDailyServiceList,
  fct_peer_count_by_client_pair_daily: fctPeerCountByClientPairDailyServiceList,
  fct_peer_fork_readiness_by_cl_client_daily: fctPeerForkReadinessByClClientDailyServiceList,
  fct_peer_fork_readiness_by_el_client_daily: fctPeerForkReadinessByElClientDailyServiceList,
  fct_custody_probe_by_client_daily: fctCustodyProbeByClientDailyServiceList,
};

/** List call for a census table */
export function censusList(table: CensusTable): ListFn {
  return CENSUS_LISTS[table] as ListFn;
}
