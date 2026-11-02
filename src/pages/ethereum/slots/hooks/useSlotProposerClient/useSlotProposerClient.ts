import { useQuery } from '@tanstack/react-query';
import {
  dimClientReleaseServiceListOptions,
  dimNodeServiceListOptions,
  fctBlockGraffitiServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { DimClientRelease } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import { UNKNOWN_CLIENT, githubCommitUrl, releaseUrl } from '@/utils/graffiti';
import {
  RESOLVED_STATUSES,
  dimClientCommitList,
  intBlockGraffitiReleaseList,
  type DimClientCommit,
  type IntBlockGraffitiRelease,
} from '@/pages/ethereum/clients/api/client-models';
import { UNRESOLVED_LABELS } from '@/pages/ethereum/clients/utils/client-versions';

/** One proposer client as shown on the slot page */
export interface ProposerClientField {
  client: string;
  /** Release the graffiti resolves to; for a branch build, the release it builds on */
  version?: string;
  versionUrl?: string;
  /** Whether the block ran a commit after `version` rather than the release itself */
  buildAfter?: boolean;
  /** Commits between `version` and the block's commit, for a branch build */
  commitsSinceRelease?: number;
  /** Commit prefix from the graffiti */
  commit?: string;
  commitUrl?: string;
  /** Why the graffiti resolves to no release */
  unresolvedNote?: string;
}

export interface SlotProposerClient {
  consensus?: ProposerClientField;
  execution?: ProposerClientField;
  graffitiText?: string;
  graffitiFormat?: string;
  /** Node name for the proposer where the network publishes one (devnets) */
  nodeName?: string;
}

/** Prefixes shorter than this only match commits from the window before the block */
const SHORT_PREFIX = 7;
const SHORT_PREFIX_WINDOW = 180 * 86400;

/** The release a block's version names, for its GitHub link */
function useRelease(client: string | undefined, version: string | undefined): DimClientRelease | undefined {
  const query = useQuery({
    ...dimClientReleaseServiceListOptions({ query: { client_eq: client, version_eq: version, page_size: 5 } }),
    enabled: !!client && !!version && client !== UNKNOWN_CLIENT,
  });
  return query.data?.dim_client_release?.find(release => !release.prerelease) ?? query.data?.dim_client_release?.[0];
}

/** The branch commit a build-after-release graffiti names, nearest before the block */
function useBranchCommit(
  client: string | undefined,
  commit: string | undefined,
  blockTime: number,
  enabled: boolean
): DimClientCommit | undefined {
  const { currentNetwork } = useNetwork();
  const query = useQuery({
    queryKey: ['slot', 'branch-commit', currentNetwork?.name, client, commit],
    queryFn: async ({ signal }) => {
      const response = (await dimClientCommitList({
        query: { client_eq: client, commit_sha_starts_with: commit, page_size: 50 },
        signal,
      })) as { data?: { dim_client_commit?: DimClientCommit[] } };
      return response.data?.dim_client_commit ?? [];
    },
    enabled: enabled && !!client && !!commit && !!currentNetwork,
    staleTime: 60 * 60 * 1000,
  });
  const short = (commit ?? '').length < SHORT_PREFIX;
  return (query.data ?? [])
    .filter(row => {
      const date = row.commit_date ?? 0;
      return date <= blockTime && (!short || date >= blockTime - SHORT_PREFIX_WINDOW);
    })
    .sort((a, b) => (b.commit_date ?? 0) - (a.commit_date ?? 0))[0];
}

/** Builds the field for one layer's client from the block's resolved release */
function buildField(
  client: string | undefined,
  version: string | undefined,
  status: string,
  commit: string | undefined,
  release: DimClientRelease | undefined,
  branchCommit: DimClientCommit | undefined
): ProposerClientField | undefined {
  if (!client || client === UNKNOWN_CLIENT) return undefined;
  const resolved = RESOLVED_STATUSES.has(status) && !!version;
  const repository = branchCommit?.repository ?? release?.repository;
  return {
    client,
    version: resolved ? version : undefined,
    versionUrl: resolved ? releaseUrl(release) : undefined,
    buildAfter: status === 'commit_untagged',
    commitsSinceRelease: branchCommit?.commits_since_base,
    commit: commit || undefined,
    commitUrl: githubCommitUrl(repository, branchCommit?.commit_sha ?? commit),
    unresolvedNote: resolved ? undefined : UNRESOLVED_LABELS[status],
  };
}

/**
 * Proposer clients for a slot, with each layer's release as xatu-cbt resolves it from the graffiti: a tagged
 * release, a build after one, or why it names none.
 */
export function useSlotProposerClient(slot: number, proposerIndex?: number | null): SlotProposerClient {
  const { currentNetwork } = useNetwork();
  const slotTime = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;

  const graffitiQuery = useQuery({
    ...fctBlockGraffitiServiceListOptions({ query: { slot_start_date_time_eq: slotTime, page_size: 10 } }),
    enabled: !!currentNetwork && slotTime > 0,
  });
  const graffiti = graffitiQuery.data?.fct_block_graffiti?.find(row => row.slot === slot);

  const releaseQuery = useQuery({
    queryKey: ['slot', 'graffiti-release', currentNetwork?.name, slotTime],
    queryFn: async ({ signal }) => {
      const response = (await intBlockGraffitiReleaseList({
        query: { slot_start_date_time_eq: slotTime, page_size: 10 },
        signal,
      })) as { data?: { int_block_graffiti_release?: IntBlockGraffitiRelease[] } };
      return response.data?.int_block_graffiti_release?.find(row => row.slot === slot) ?? null;
    },
    enabled: !!currentNetwork && slotTime > 0,
  });
  const row = releaseQuery.data ?? undefined;

  const clStatus = row?.consensus_client_release_status ?? '';
  const elStatus = row?.execution_client_release_status ?? '';
  const clRelease = useRelease(row?.consensus_client, row?.consensus_client_version || undefined);
  const elRelease = useRelease(row?.execution_client, row?.execution_client_version || undefined);
  const clBranch = useBranchCommit(
    row?.consensus_client,
    row?.consensus_client_commit,
    slotTime,
    clStatus === 'commit_untagged'
  );
  const elBranch = useBranchCommit(
    row?.execution_client,
    row?.execution_client_commit,
    slotTime,
    elStatus === 'commit_untagged'
  );

  const index = proposerIndex ?? graffiti?.proposer_index;
  const nodeQuery = useQuery({
    ...dimNodeServiceListOptions({ query: { validator_index_eq: index ?? 0, page_size: 1 } }),
    enabled: !!currentNetwork && index !== undefined && index !== null,
  });
  const nodeName = nodeQuery.data?.dim_node?.find(node => !!node.name)?.name ?? undefined;

  if (!row) return { nodeName, graffitiText: graffiti?.graffiti_text || undefined };

  return {
    consensus: buildField(
      row.consensus_client,
      row.consensus_client_version,
      clStatus,
      row.consensus_client_commit,
      clRelease,
      clBranch
    ),
    execution: buildField(
      row.execution_client,
      row.execution_client_version,
      elStatus,
      row.execution_client_commit,
      elRelease,
      elBranch
    ),
    graffitiText: graffiti?.graffiti_text || undefined,
    graffitiFormat: row.graffiti_format ?? graffiti?.graffiti_format,
    nodeName,
  };
}
