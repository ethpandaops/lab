import { useQuery } from '@tanstack/react-query';
import {
  dimClientReleaseServiceListOptions,
  dimNodeServiceListOptions,
  fctBlockGraffitiServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { DimClientRelease } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import {
  UNKNOWN_CLIENT,
  findReleaseByVersion,
  githubCommitUrl,
  githubReleaseUrl,
  resolveClientRelease,
} from '@/utils/graffiti';

/** One proposer client as shown on the slot page */
export interface ProposerClientField {
  client: string;
  /** Release version, from the graffiti's version string or resolved from its commit prefix */
  version?: string;
  versionUrl?: string;
  /** Commit prefix from the graffiti */
  commit?: string;
  commitUrl?: string;
  /** Why the commit did not resolve to a version, for a tooltip */
  commitNote?: string;
}

export interface SlotProposerClient {
  consensus?: ProposerClientField;
  execution?: ProposerClientField;
  graffitiText?: string;
  graffitiFormat?: string;
  /** Node name for the proposer where the network publishes one (devnets) */
  nodeName?: string;
}

const HEX_PREFIX = /^[0-9a-f]{2,40}$/;

/** Releases for a client matching a commit prefix, or a version when there is no commit */
function useReleases(client: string | undefined, commit: string, version: string | undefined): DimClientRelease[] {
  const byCommit = HEX_PREFIX.test(commit);
  const versions = version ? [version, version.replace(/^v/i, ''), `v${version.replace(/^v/i, '')}`] : [];
  const query = useQuery({
    ...dimClientReleaseServiceListOptions({
      query: byCommit
        ? { client_eq: client, commit_sha_starts_with: commit, page_size: 100 }
        : { client_eq: client, version_in_values: [...new Set(versions)].join(','), page_size: 100 },
    }),
    enabled: !!client && client !== UNKNOWN_CLIENT && (byCommit || versions.length > 0),
  });
  return query.data?.dim_client_release ?? [];
}

/** Repository of a client, for linking commits that match no release */
function useRepository(client: string | undefined, enabled: boolean): string | undefined {
  const query = useQuery({
    ...dimClientReleaseServiceListOptions({ query: { client_eq: client, page_size: 1 } }),
    enabled: enabled && !!client && client !== UNKNOWN_CLIENT,
  });
  return query.data?.dim_client_release?.[0]?.repository;
}

/** Builds the field for one client from its graffiti parse and the matching releases */
function buildField(
  client: string | undefined,
  commit: string,
  graffitiVersion: string | undefined,
  releases: DimClientRelease[],
  fallbackRepository: string | undefined,
  blockTime: number
): ProposerClientField | undefined {
  if (!client || client === UNKNOWN_CLIENT) return undefined;

  const resolution = HEX_PREFIX.test(commit) ? resolveClientRelease(releases, commit, blockTime) : undefined;
  const release =
    resolution?.status === 'resolved' ? resolution.release : findReleaseByVersion(releases, graffitiVersion);
  const repository = release?.repository ?? releases[0]?.repository ?? fallbackRepository;
  const version = graffitiVersion || release?.version;

  let commitNote: string | undefined;
  if (!version && resolution?.status === 'ambiguous') commitNote = `Matches ${resolution.candidates} releases`;
  if (!version && resolution?.status === 'unmatched') commitNote = 'No release with this commit';

  return {
    client,
    version,
    versionUrl: release ? githubReleaseUrl(release.repository ?? repository, release.tag) : undefined,
    commit: commit || undefined,
    commitUrl: githubCommitUrl(repository, commit),
    commitNote,
  };
}

/**
 * Proposer clients for a slot from its parsed graffiti, with versions linked to their GitHub releases.
 */
export function useSlotProposerClient(slot: number, proposerIndex?: number | null): SlotProposerClient {
  const { currentNetwork } = useNetwork();
  const slotTime = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;

  const graffitiQuery = useQuery({
    ...fctBlockGraffitiServiceListOptions({ query: { slot_start_date_time_eq: slotTime, page_size: 10 } }),
    enabled: !!currentNetwork && slotTime > 0,
  });
  const graffiti = graffitiQuery.data?.fct_block_graffiti?.find(row => row.slot === slot);

  const clCommit = (graffiti?.consensus_client_commit ?? '').toLowerCase();
  const elCommit = (graffiti?.execution_client_commit ?? '').toLowerCase();
  const clVersion = graffiti?.consensus_client_version || undefined;
  const clReleases = useReleases(graffiti?.consensus_client, clCommit, clVersion);
  const elReleases = useReleases(graffiti?.execution_client, elCommit, undefined);
  const clRepository = useRepository(graffiti?.consensus_client, !!graffiti && clReleases.length === 0);
  const elRepository = useRepository(graffiti?.execution_client, !!graffiti && elReleases.length === 0);

  const index = proposerIndex ?? graffiti?.proposer_index;
  const nodeQuery = useQuery({
    ...dimNodeServiceListOptions({ query: { validator_index_eq: index ?? 0, page_size: 1 } }),
    enabled: !!currentNetwork && index !== undefined && index !== null,
  });

  if (!graffiti) return { nodeName: nodeQuery.data?.dim_node?.find(row => !!row.name)?.name ?? undefined };

  return {
    consensus: buildField(graffiti.consensus_client, clCommit, clVersion, clReleases, clRepository, slotTime),
    execution: buildField(graffiti.execution_client, elCommit, undefined, elReleases, elRepository, slotTime),
    graffitiText: graffiti.graffiti_text || undefined,
    graffitiFormat: graffiti.graffiti_format,
    nodeName: nodeQuery.data?.dim_node?.find(row => !!row.name)?.name ?? undefined,
  };
}
