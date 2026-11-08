import { useMemo } from 'react';
import {
  fctPeerCountBySourceDailyServiceList,
  fctPeerReachabilityByClClientDailyServiceList,
  fctPeerSyncStatusByClClientDailyServiceList,
} from '@/api/sdk.gen';
import type {
  FctPeerCountBySourceDaily,
  FctPeerReachabilityByClClientDaily,
  FctPeerSyncStatusByClClientDaily,
} from '@/api/types.gen';
import {
  CENSUS_TABLES,
  censusList,
  type FctPeerCountByClientAsnDaily,
  type FctPeerCountByClientCountryDaily,
  type FctPeerForkReadinessByClClientDaily,
  type FctPeerForkReadinessByElClientDaily,
} from '@/pages/ethereum/clients/api/client-models';
import type { fetchAllPages } from '@/utils/api-pagination';
import { onChainRows } from '../utils/network-census';
import { useRangeDays, type UseRangeDaysResult } from './useRangeDays';
import { useRangeEnds, type UseRangeEndsResult } from './useRangeEnds';

type ListFn = Parameters<typeof fetchAllPages>[0];

export interface OverviewCensus {
  /** Network-wide consensus peers by source, custody and connection, one row a day */
  peers: UseRangeDaysResult<FctPeerCountBySourceDaily>;
  /** Consensus peers' head and finality lag, fork and history per client, each day */
  sync: UseRangeDaysResult<FctPeerSyncStatusByClClientDaily>;
  /** How each consensus client's peers connect, each day */
  reachability: UseRangeDaysResult<FctPeerReachabilityByClClientDaily>;
  /** Consensus peers per client and country on the range's first and last days */
  countries: UseRangeEndsResult<FctPeerCountByClientCountryDaily>;
  /** Consensus peers per client and network on the range's first and last days */
  networks: UseRangeEndsResult<FctPeerCountByClientAsnDaily>;
  /** Consensus ENRs per client and next fork digest, latest day only */
  clReadiness: UseRangeEndsResult<FctPeerForkReadinessByClClientDaily>;
  /** Execution ENRs on this chain per client and next fork, latest day only */
  elReadiness: FctPeerForkReadinessByElClientDaily[];
  isLoading: boolean;
}

const ALL = {};

const TABLES = {
  peers: 'fct_peer_count_by_source_daily',
  sync: 'fct_peer_sync_status_by_cl_client_daily',
  reachability: 'fct_peer_reachability_by_cl_client_daily',
} as const;

/**
 * Everything the network overview shows: the daily series over the range, the places on its first and last days,
 * and fork readiness on its latest day.
 */
export function useOverviewCensus(days: number | null): OverviewCensus {
  const peers = useRangeDays<FctPeerCountBySourceDaily>(
    fctPeerCountBySourceDailyServiceList as ListFn,
    TABLES.peers,
    days
  );
  const sync = useRangeDays<FctPeerSyncStatusByClClientDaily>(
    fctPeerSyncStatusByClClientDailyServiceList as ListFn,
    TABLES.sync,
    days
  );
  const reachability = useRangeDays<FctPeerReachabilityByClClientDaily>(
    fctPeerReachabilityByClClientDailyServiceList as ListFn,
    TABLES.reachability,
    days
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
  const elReadiness = useRangeEnds<FctPeerForkReadinessByElClientDaily>(
    censusList(CENSUS_TABLES.elReadiness),
    CENSUS_TABLES.elReadiness,
    ALL,
    1
  );
  const elOnChain = useMemo(() => onChainRows(elReadiness.end), [elReadiness.end]);

  return {
    peers,
    sync,
    reachability,
    countries,
    networks,
    clReadiness,
    elReadiness: elOnChain,
    isLoading: peers.isLoading || sync.isLoading || reachability.isLoading,
  };
}
