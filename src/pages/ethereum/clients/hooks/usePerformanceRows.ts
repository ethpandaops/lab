import {
  fctAttestationVoteCorrectnessByClientDailyList,
  fctBlockProposalByClientDailyList,
  type FctAttestationVoteCorrectnessByClientDaily,
  type FctBlockProposalByClientDaily,
} from '@/pages/ethereum/clients/api/client-models';
import type { ClientLayer } from '@/pages/ethereum/clients/utils/client-share';
import { useDailyByClient, type UseDailyByClientResult } from './useDailyByClient';

/** Blocks proposed with each client of a layer per day, over a window */
export function useProposalRows(
  layer: ClientLayer,
  from: number | undefined
): UseDailyByClientResult<FctBlockProposalByClientDaily> {
  return useDailyByClient<FctBlockProposalByClientDaily>(
    fctBlockProposalByClientDailyList,
    'fct_block_proposal_by_client_daily',
    { layer_eq: layer },
    from
  );
}

/** Attestation duties of validators per client of a layer per day, over a window */
export function useAttestationRows(
  layer: ClientLayer,
  from: number | undefined
): UseDailyByClientResult<FctAttestationVoteCorrectnessByClientDaily> {
  return useDailyByClient<FctAttestationVoteCorrectnessByClientDaily>(
    fctAttestationVoteCorrectnessByClientDailyList,
    'fct_attestation_vote_correctness_by_client_daily',
    { layer_eq: layer },
    from
  );
}
