import { useQuery } from '@tanstack/react-query';
import {
  dimClientReleaseServiceListOptions,
  dimNodeServiceListOptions,
  fctBlockGraffitiServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { DimClientRelease, DimNode, FctBlockGraffiti } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { slotToTimestamp } from '@/utils/beacon';
import { UNKNOWN_CLIENT, resolveClientRelease, type ClientReleaseResolution } from '@/utils/graffiti';

/** Where the slot sits relative to the parsed graffiti data */
export type GraffitiCoverage = 'covered' | 'not_collected' | 'not_yet_processed' | 'before_backfill';

export interface SlotProposerClientData {
  /** Parsed graffiti of the canonical block, undefined when there is none */
  graffiti?: FctBlockGraffiti;
  consensusRelease: ClientReleaseResolution;
  executionRelease: ClientReleaseResolution;
  /** Node metadata for the proposer, only set when it has a name (devnets) */
  node?: DimNode;
  coverage: GraffitiCoverage;
  isLoading: boolean;
  /** Message of the failed graffiti request, null when it succeeded */
  error: string | null;
}

/** Fetches the releases a client's commit prefix may resolve to */
function useClientReleases(
  client: string | undefined,
  commit: string | undefined,
  enabled: boolean
): { releases: DimClientRelease[]; isLoading: boolean } {
  const prefix = (commit ?? '').toLowerCase();
  const query = useQuery({
    ...dimClientReleaseServiceListOptions({
      query: { client_eq: client, commit_sha_starts_with: prefix, page_size: 100 },
    }),
    enabled: enabled && !!client && client !== UNKNOWN_CLIENT && /^[0-9a-f]{2,40}$/.test(prefix),
  });
  return { releases: query.data?.dim_client_release ?? [], isLoading: query.isLoading };
}

/**
 * Proposer client details for a slot: parsed graffiti, commit prefixes resolved to releases, and node metadata.
 */
export function useSlotProposerClient(slot: number, proposerIndex?: number | null): SlotProposerClientData {
  const { currentNetwork } = useNetwork();
  const slotTime = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const { data: bounds, isLoading: boundsLoading } = useTableBounds('fct_block_graffiti');

  const graffitiQuery = useQuery({
    ...fctBlockGraffitiServiceListOptions({ query: { slot_start_date_time_eq: slotTime, page_size: 10 } }),
    enabled: !!currentNetwork && slotTime > 0,
  });
  const graffiti = graffitiQuery.data?.fct_block_graffiti?.find(row => row.slot === slot);

  const consensusReleases = useClientReleases(
    graffiti?.consensus_client,
    graffiti?.consensus_client_commit,
    !!graffiti && !graffiti.consensus_client_version
  );
  const executionReleases = useClientReleases(
    graffiti?.execution_client,
    graffiti?.execution_client_commit,
    !!graffiti
  );

  const index = proposerIndex ?? graffiti?.proposer_index;
  const nodeQuery = useQuery({
    ...dimNodeServiceListOptions({ query: { validator_index_eq: index ?? 0, page_size: 1 } }),
    enabled: !!currentNetwork && index !== undefined && index !== null,
  });
  const node = nodeQuery.data?.dim_node?.find(row => !!row.name);

  let coverage: GraffitiCoverage = 'covered';
  if (!boundsLoading && !bounds) coverage = 'not_collected';
  else if (bounds && slotTime > bounds.max) coverage = 'not_yet_processed';
  else if (bounds && slotTime < bounds.min) coverage = 'before_backfill';

  return {
    graffiti,
    consensusRelease: resolveClientRelease(consensusReleases.releases, graffiti?.consensus_client_commit, slotTime),
    executionRelease: resolveClientRelease(executionReleases.releases, graffiti?.execution_client_commit, slotTime),
    node,
    coverage,
    isLoading: graffitiQuery.isLoading || boundsLoading || consensusReleases.isLoading || executionReleases.isLoading,
    error: graffitiQuery.error ? (graffitiQuery.error.message ?? 'request failed') : null,
  };
}
