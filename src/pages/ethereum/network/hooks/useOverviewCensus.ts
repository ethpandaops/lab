import { useMemo } from 'react';
import {
  CENSUS_TABLES,
  censusList,
  fctBlockProposalByClientDailyList,
  type FctBlockProposalByClientDaily,
  type FctPeerCountByClClientDaily,
  type FctPeerCountByClientAsnDaily,
  type FctPeerCountByClientCountryDaily,
  type FctPeerForkReadinessByClClientDaily,
  type FctPeerForkReadinessByElClientDaily,
} from '@/pages/ethereum/clients/api/client-models';
import { EL_CRAWL_START } from '../constants';
import { onChainRows } from '../utils/network-census';
import { useRangeEnds, type UseRangeEndsResult } from './useRangeEnds';

export interface OverviewCensus {
  /** Consensus peers per client and version */
  cl: UseRangeEndsResult<FctPeerCountByClClientDaily>;
  /** Execution nodes on this chain per client, version and fork ID */
  el: UseRangeEndsResult<FctPeerForkReadinessByElClientDaily>;
  /** Consensus peers per client and country */
  countries: UseRangeEndsResult<FctPeerCountByClientCountryDaily>;
  /** Consensus peers per client and network */
  networks: UseRangeEndsResult<FctPeerCountByClientAsnDaily>;
  /** Consensus ENRs per client and next fork digest, latest day only */
  clReadiness: UseRangeEndsResult<FctPeerForkReadinessByClClientDaily>;
  /** Execution ENRs on this chain per client and next fork, latest day only */
  elReadiness: FctPeerForkReadinessByElClientDaily[];
  /** Proposed blocks per client, latest day only */
  blocks: UseRangeEndsResult<FctBlockProposalByClientDaily>;
  isLoading: boolean;
}

const ALL = {};

/**
 * Everything the network overview shows, as rows of the range's first and last days. Execution nodes count only those
 * on this chain, from the execution ENR crawl's fork IDs.
 */
export function useOverviewCensus(days: number | null): OverviewCensus {
  const cl = useRangeEnds<FctPeerCountByClClientDaily>(
    censusList(CENSUS_TABLES.clPeers),
    CENSUS_TABLES.clPeers,
    ALL,
    days
  );
  const elAll = useRangeEnds<FctPeerForkReadinessByElClientDaily>(
    censusList(CENSUS_TABLES.elReadiness),
    CENSUS_TABLES.elReadiness,
    ALL,
    days,
    EL_CRAWL_START
  );
  const countries = useRangeEnds<FctPeerCountByClientCountryDaily>(
    censusList(CENSUS_TABLES.clCountry),
    CENSUS_TABLES.clCountry,
    ALL,
    days
  );
  const networks = useRangeEnds<FctPeerCountByClientAsnDaily>(
    censusList(CENSUS_TABLES.clAsn),
    CENSUS_TABLES.clAsn,
    ALL,
    days
  );
  const clReadiness = useRangeEnds<FctPeerForkReadinessByClClientDaily>(
    censusList(CENSUS_TABLES.clReadiness),
    CENSUS_TABLES.clReadiness,
    ALL,
    1
  );
  const blocks = useRangeEnds<FctBlockProposalByClientDaily>(
    fctBlockProposalByClientDailyList,
    'fct_block_proposal_by_client_daily',
    ALL,
    1
  );

  const elEnd = useMemo(() => onChainRows(elAll.end), [elAll.end]);
  const elStart = useMemo(() => (elAll.start ? onChainRows(elAll.start) : null), [elAll.start]);
  const el = useMemo(() => ({ ...elAll, end: elEnd, start: elStart }), [elAll, elEnd, elStart]);

  return {
    cl,
    el,
    countries,
    networks,
    clReadiness,
    elReadiness: elEnd,
    blocks,
    isLoading: cl.isLoading || elAll.isLoading || countries.isLoading || networks.isLoading,
  };
}
