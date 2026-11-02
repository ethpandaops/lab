import { useQuery } from '@tanstack/react-query';
import { client as apiClient } from '@/api/client.gen';
import { useNetwork } from '@/hooks/useNetwork';
import type { FctAttestationVoteCorrectnessByClientDaily, FctBlockProposalByClientDaily } from '../api/client-models';
import type { ClientLayer } from '../utils/client-share';
import { useDailyByClient } from './useDailyByClient';

/**
 * Per consensus and execution client pair tables requested from xatu-cbt. They are not in the generated client yet,
 * so they are called by path and only used once a probe finds them.
 */
const PAIR_TABLES = {
  proposals: 'fct_block_proposal_by_client_pair_daily',
  attestations: 'fct_attestation_vote_correctness_by_client_pair_daily',
} as const;

type PairKeys = { consensus_client?: string; execution_client?: string };
export type ProposalPairRow = Omit<FctBlockProposalByClientDaily, 'client' | 'layer'> & PairKeys;
export type AttestationPairRow = Omit<FctAttestationVoteCorrectnessByClientDaily, 'client' | 'layer'> & PairKeys;

/** A list call by table path, in the shape `fetchAllPages` takes */
function listByPath(table: string) {
  return (params: { query?: Record<string, unknown>; signal?: AbortSignal }): Promise<{ data: unknown }> =>
    apiClient.get({
      url: `/api/v1/${table}`,
      query: params.query,
      signal: params.signal,
      throwOnError: true,
    }) as Promise<{ data: unknown }>;
}

/** Whether the API serves a table, by asking for one row */
function useServes(table: string): boolean {
  const { currentNetwork } = useNetwork();
  const probe = useQuery({
    queryKey: ['client-pages', 'serves', currentNetwork?.name, table],
    queryFn: async ({ signal }) => {
      await listByPath(table)({ query: { page_size: 1 }, signal });
      return true;
    },
    enabled: !!currentNetwork,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });
  return probe.data === true;
}

/**
 * Proposal and attestation metrics of `client` broken down by its partner on the other layer, over a window. Empty
 * until the API serves the pair tables.
 */
export function usePairMetrics(
  client: string,
  layer: ClientLayer,
  from: number | undefined
): { proposals: ProposalPairRow[]; attestations: AttestationPairRow[]; available: boolean; isLoading: boolean } {
  const servesProposals = useServes(PAIR_TABLES.proposals);
  const servesAttestations = useServes(PAIR_TABLES.attestations);
  const filter = { [layer === 'consensus' ? 'consensus_client_eq' : 'execution_client_eq']: client };
  const proposals = useDailyByClient<ProposalPairRow & { day_start_date?: string }>(
    listByPath(PAIR_TABLES.proposals),
    PAIR_TABLES.proposals,
    servesProposals ? filter : null,
    from
  );
  const attestations = useDailyByClient<AttestationPairRow & { day_start_date?: string }>(
    listByPath(PAIR_TABLES.attestations),
    PAIR_TABLES.attestations,
    servesAttestations ? filter : null,
    from
  );
  return {
    proposals: proposals.rows,
    attestations: attestations.rows,
    available: proposals.rows.length > 0 || attestations.rows.length > 0,
    isLoading: (servesProposals && proposals.isLoading) || (servesAttestations && attestations.isLoading),
  };
}
